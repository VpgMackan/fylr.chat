import os
import sys
import logging
from typing import Tuple

import pika
import boto3
from dotenv import load_dotenv
from botocore.config import Config

from handlers import manager


class FileIngestor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.s3_bucket = None
        self.channel = None

    def setup_s3_client(self) -> None:
        """Initialize S3 client and bucket."""
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=os.getenv("S3_KEY_ID"),
            aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
            region_name=os.getenv("S3_REGION"),
            endpoint_url=f"http://{os.getenv('S3_ENDPOINT')}:{os.getenv('S3_PORT')}",
            config=Config(s3={"addressing_style": "path"}),
        )
        self.s3_bucket = s3.Bucket("fylr.chat-sources")

    def setup_rabbitmq_connection(self) -> None:
        """Initialize RabbitMQ connection and channel."""
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(os.getenv("RABBITMQ_HOST", "localhost"))
        )
        self.channel = connection.channel()
        self.channel.queue_declare("file-processing", durable=True)

    def parse_message_body(self, body: bytes) -> Tuple[str, str]:
        """Parse the message body to extract file key and type."""
        decoded_body = body.decode("utf-8").strip('"')
        if ";" not in decoded_body:
            raise ValueError(f"Invalid message format: {decoded_body}")
        return decoded_body.split(";", 1)

    def process_file_message(self, ch, method, properties, body: bytes) -> None:
        """Process a single file message from the queue."""
        try:
            file_key, file_type = self.parse_message_body(body)
            self.logger.info(f"Processing file: {file_key} with type: {file_type}")

            obj = self.s3_bucket.Object(file_key)
            buffer = obj.get()["Body"].read()

            manager.process_data(file_type=file_type, buffer=buffer)
            self.logger.info(f"Successfully processed file: {file_key}")

        except Exception as e:
            self.logger.error(f"Error processing message {body}: {e}")

    def start_consuming(self) -> None:
        """Start consuming messages from the queue."""
        self.channel.basic_consume(
            queue="file-processing",
            on_message_callback=self.process_file_message,
            auto_ack=True,
        )

        self.logger.info("Waiting for messages. To exit press CTRL+C")
        self.channel.start_consuming()

    def run(self) -> None:
        """Main entry point for the file ingestor."""
        self.logger.info("Starting file ingestor...")
        load_dotenv()

        self.setup_s3_client()
        self.setup_rabbitmq_connection()
        self.start_consuming()


def main():
    """Main function to run the file ingestor."""
    ingestor = FileIngestor()
    ingestor.run()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted")
        sys.exit(0)
