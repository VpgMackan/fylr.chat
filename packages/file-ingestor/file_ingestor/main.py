import os
import sys
import json
import logging
from typing import Tuple

import pika
import boto3
from dotenv import load_dotenv
from botocore.config import Config

from .handlers import manager

from .vector.saver import save_text_chunks_as_vectors


class FileIngestor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.s3_bucket = None
        self.channel = None

    def info(self, message: str, job_key: str = None, payload: object = None) -> None:
        """Log info and send status update if job_key is provided."""
        self.logger.info(message)
        if job_key:
            self.status_update(job_key, payload or {"message": message})

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

    def parse_message_body(self, body: bytes) -> Tuple[str, str, str]:
        """Parse the message body to extract source ID, file key and type."""
        try:
            decoded_body = body.decode("utf-8")
            message_data = json.loads(decoded_body)

            source_id = message_data.get("sourceId")
            s3_key = message_data.get("s3Key")
            mime_type = message_data.get("mimeType")
            job_key = message_data.get("jobKey")

            if not all([source_id, s3_key, mime_type, job_key]):
                missing_fields = [
                    field
                    for field, value in [
                        ("sourceId", source_id),
                        ("s3Key", s3_key),
                        ("mimeType", mime_type),
                        ("jobKey", job_key),
                    ]
                    if not value
                ]
                raise ValueError(
                    f"Missing required fields: {', '.join(missing_fields)}"
                )

            return source_id, s3_key, mime_type, job_key

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON message format: {e}")
        except Exception as e:
            raise ValueError(f"Error parsing message: {e}")

    def process_file_message(self, ch, method, properties, body: bytes) -> None:
        """Process a single file message from the queue."""
        try:
            source_id, file_key, file_type, job_key = self.parse_message_body(body)
            self.info(
                f"Processing file: {file_key} (sourceId: {source_id}) with type: {file_type}",
                job_key=job_key,
            )

            self.info("Fetching file from S3...", job_key=job_key)
            obj = self.s3_bucket.Object(file_key)
            buffer = obj.get()["Body"].read()

            self.info(
                "Passing to handler for processing...",
                job_key=job_key,
                payload={"stage": "parsing"},
            )
            docs = manager.process_data(
                file_type=file_type,
                buffer=buffer,
                job_key=job_key,
                info_callback=self.info,
            )
            if not isinstance(docs, list):
                raise Exception(f"Handler failed to return docs: {docs}")

            self.info(
                "Passing chunks to vector saver...",
                job_key=job_key,
                payload={"stage": "vectorizing"},
            )
            save_text_chunks_as_vectors(docs, source_id, job_key, self.info)

            self.info(f"Successfully processed file: {file_key}", job_key=job_key)
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            error_message = f"Fatal error processing message {body}: {e}"
            self.logger.error(error_message)
            if job_key:
                self.info(error_message, job_key)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def start_consuming(self) -> None:
        """Start consuming messages from the queue."""
        self.channel.basic_consume(
            queue="file-processing",
            on_message_callback=self.process_file_message,
            auto_ack=False,
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

    def status_update(self, job_key: str, payload: object) -> None:
        """Send a status update to the "fylr-event" exchange."""
        if not self.channel:
            raise RuntimeError("RabbitMQ channel is not initialized.")
        self.channel.basic_publish(
            exchange="fylr-events",
            routing_key=f"job.{job_key}.status",
            body=json.dumps({"eventName": "jobStatusUpdate", "payload": payload}),
            properties=pika.BasicProperties(delivery_mode=2),
        )
        self.logger.info(f"Status update sent for job {job_key}: {payload}")


def main():
    """Main function to run the file ingestor."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    try:
        ingestor = FileIngestor()
        ingestor.run()
    except KeyboardInterrupt:
        print("Interrupted")
        sys.exit(0)


if __name__ == "__main__":
    main()
