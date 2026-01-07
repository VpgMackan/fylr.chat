import pika
import sys
from functools import partial

from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from .config import settings
from .database import get_db_session
from .generator_service import GeneratorService
from .generators.base_generator import BaseGenerator

import logging
from .telemetry import setup_telemetry

setup_telemetry(settings.otel_service_name)
log = logging.getLogger(__name__)


def on_message_callback(
    channel: BlockingChannel,
    method: Basic.Deliver,
    properties: BasicProperties,
    body: bytes,
    generator_instance: BaseGenerator,
):
    """
    Wrapper callback that handles database session management for each message.
    """
    log.info(
        f"Received message with delivery tag {method.delivery_tag}",
        extra={"method": "on_message_callback"},
    )
    try:
        with get_db_session() as db:
            generator_instance.generate(db, channel, method, properties, body)
    except Exception as e:
        log.error(
            f"Unhandled exception in message callback: {e}",
            exc_info=True,
            extra={"method": "on_message_callback"},
        )
        # Only nack if channel is still open
        if channel.is_open:
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        else:
            log.warning(
                "Channel closed during error handling. Message may be redelivered.",
                extra={"method": "on_message_callback"},
            )


def main():
    """
    Main entry point for the Generator service.
    Initializes services and starts consuming messages from RabbitMQ.
    """
    log.info("Starting Generator service...", extra={"method": "main"})

    try:
        generator_service = GeneratorService()
        configs = generator_service.get_generator_configs()

        # Configure connection parameters with heartbeat for long-running tasks
        credentials = pika.PlainCredentials(
            settings.rabbitmq_user, settings.rabbitmq_password
        )
        connection_params = pika.ConnectionParameters(
            host=settings.rabbitmq_host,
            port=settings.rabbitmq_port,
            credentials=credentials,
            heartbeat=settings.rabbitmq_heartbeat,
            blocked_connection_timeout=settings.rabbitmq_blocked_connection_timeout,
        )

        connection = pika.BlockingConnection(connection_params)
        channel = connection.channel()

        # Enable publisher confirms for reliability
        channel.confirm_delivery()

        # Set QoS to prefetch only 1 message at a time
        # This is important for long-running tasks to prevent timeout issues
        channel.basic_qos(prefetch_count=1)

        dlx_name = "fylr-dlx"
        channel.exchange_declare(
            exchange=dlx_name, exchange_type="direct", durable=True
        )

        for gen_name, config in configs.items():
            queue_name = config["queue_name"]
            dlq_name = config["dlq_name"]
            routing_key = config["routing_key"]

            generator_class = generator_service.get_generator_class(gen_name)
            if not generator_class:
                log.critical(
                    f"Could not find or load generator class for '{gen_name}'. Skipping.",
                    extra={"method": "main"},
                )
                continue

            generator_instance = generator_class()

            channel.queue_declare(queue=dlq_name, durable=True)
            channel.queue_bind(
                queue=dlq_name, exchange=dlx_name, routing_key=routing_key
            )

            channel.queue_declare(
                queue=queue_name,
                durable=True,
                arguments={
                    "x-dead-letter-exchange": dlx_name,
                    "x-dead-letter-routing-key": routing_key,
                },
            )
            log.info(
                f"Declared queue '{queue_name}' with DLQ support",
                extra={"method": "main"},
            )

            on_message_with_generator = partial(
                on_message_callback, generator_instance=generator_instance
            )

            channel.basic_consume(
                queue=queue_name,
                on_message_callback=on_message_with_generator,
                auto_ack=False,
            )

        log.info("Waiting for messages. To exit press CTRL+C", extra={"method": "main"})
        channel.start_consuming()

    except pika.exceptions.AMQPConnectionError as e:
        log.critical(f"Failed to connect to RabbitMQ: {e}", extra={"method": "main"})
        sys.exit(1)
    except KeyboardInterrupt:
        log.info("Service stopped by user.", extra={"method": "main"})
    except Exception as e:
        log.critical(
            f"An unhandled error occurred during startup: {e}",
            exc_info=True,
            extra={"method": "main"},
        )
        sys.exit(1)
    finally:
        if "connection" in locals() and connection.is_open:
            connection.close()
        log.info("Generator service shut down.", extra={"method": "main"})
