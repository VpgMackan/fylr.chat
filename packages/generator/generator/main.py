import pika
import sys
from functools import partial

from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from .database import get_db_session
from .generator_service import GeneratorService
from .generators.base_generator import BaseGenerator

from .logging_config import configure_logging
import structlog

configure_logging(log_level="INFO", json_logs=False)
log = structlog.getLogger(__name__)


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
        method="on_message_callback",
    )
    try:
        with get_db_session() as db:
            generator_instance.generate(db, channel, method, properties, body)
    except Exception as e:
        log.error(
            f"Unhandled exception in message callback: {e}",
            exc_info=True,
            method="on_message_callback",
        )
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main():
    """
    Main entry point for the Generator service.
    Initializes services and starts consuming messages from RabbitMQ.
    """
    log.info("Starting Generator service...", method="main")

    try:
        generator_service = GeneratorService()
        configs = generator_service.get_generator_configs()

        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host="localhost")
        )
        channel = connection.channel()
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
                    method="main",
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
                method="main",
            )

            on_message_with_generator = partial(
                on_message_callback, generator_instance=generator_instance
            )

            channel.basic_consume(
                queue=queue_name,
                on_message_callback=on_message_with_generator,
                auto_ack=False,
            )

        log.info("Waiting for messages. To exit press CTRL+C", method="main")
        channel.start_consuming()

    except pika.exceptions.AMQPConnectionError as e:
        log.critical(f"Failed to connect to RabbitMQ: {e}", method="main")
        sys.exit(1)
    except KeyboardInterrupt:
        log.info("Service stopped by user.", method="main")
    except Exception as e:
        log.critical(
            f"An unhandled error occurred during startup: {e}",
            exc_info=True,
            method="main",
        )
        sys.exit(1)
    finally:
        if "connection" in locals() and connection.is_open:
            connection.close()
        log.info("Generator service shut down.", method="main")
