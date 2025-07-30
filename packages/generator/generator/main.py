import pika
import logging
import sys
from functools import partial

from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from .database import get_db_session
from .generator_service import GeneratorService
from .generators.base_generator import BaseGenerator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


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
    logger.info(f"Received message with delivery tag {method.delivery_tag}")
    try:
        with get_db_session() as db:
            generator_instance.generate(db, channel, method, properties, body)
    except Exception as e:
        logger.error(f"Unhandled exception in message callback: {e}", exc_info=True)
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main():
    """
    Main entry point for the Generator service.
    Initializes services and starts consuming messages from RabbitMQ.
    """
    logger.info("Starting Generator service...")

    try:
        generator_service = GeneratorService()

        queue_name = "summary-generator"
        generator_class = generator_service.get_generator_class("summary")

        if not generator_class:
            logger.critical(
                f"Could not find or load generator class for 'summary'. Exiting."
            )
            sys.exit(1)

        generator_instance = generator_class()

        # Setup RabbitMQ connection
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host="localhost")
        )
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        logger.info(f"Connected to RabbitMQ and declared queue '{queue_name}'")

        # Create a partial function to pass the generator instance to the callback
        on_message_with_generator = partial(
            on_message_callback, generator_instance=generator_instance
        )

        channel.basic_consume(
            queue=queue_name,
            on_message_callback=on_message_with_generator,
            auto_ack=False,  # Manual message acknowledgment
        )

        logger.info("Waiting for messages. To exit press CTRL+C")
        channel.start_consuming()

    except pika.exceptions.AMQPConnectionError as e:
        logger.critical(f"Failed to connect to RabbitMQ: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Service stopped by user.")
    except Exception as e:
        logger.critical(
            f"An unhandled error occurred during startup: {e}", exc_info=True
        )
        sys.exit(1)
    finally:
        if "connection" in locals() and connection.is_open:
            connection.close()
        logger.info("Generator service shut down.")
