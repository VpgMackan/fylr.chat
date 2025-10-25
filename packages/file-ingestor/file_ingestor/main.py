import os
import sys
import json
from typing import Tuple

import pika
import boto3
from dotenv import load_dotenv
from botocore.config import Config

from .handlers import manager

from .vector.saver import save_text_chunks_as_vectors, update_source_status

from .logging_config import configure_logging
import structlog

configure_logging(log_level="INFO", json_logs=False)


class FileIngestor:
    def __init__(self):
        self.logger = structlog.get_logger()
        self.s3_bucket = None
        self.channel = None

    def info(self, message: str, job_key: str = None, payload: object = None) -> None:
        """Log info and send status update if job_key is provided."""
        self.logger.info(message, method="info")
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
        dlx_name = "fylr-dlx"
        dlq_name = "file-processing.dlq"
        self.channel.exchange_declare(
            exchange=dlx_name, exchange_type="direct", durable=True
        )
        self.channel.queue_declare(queue=dlq_name, durable=True)
        self.channel.queue_bind(
            queue=dlq_name, exchange=dlx_name, routing_key="file-processing"
        )

        self.channel.queue_declare(
            "file-processing",
            durable=True,
            arguments={
                "x-dead-letter-exchange": dlx_name,
                "x-dead-letter-routing-key": "file-processing",
            },
        )

    def parse_message_body(self, body: bytes) -> Tuple[str, str, str, str, str]:
        """Parse the message body to extract source ID, file key and type."""
        try:
            decoded_body = body.decode("utf-8")
            message_data = json.loads(decoded_body)

            source_id = message_data.get("sourceId")
            s3_key = message_data.get("s3Key")
            mime_type = message_data.get("mimeType")
            job_key = message_data.get("jobKey")
            embedding_model = message_data.get("embeddingModel")

            if not all([source_id, s3_key, mime_type, job_key, embedding_model]):
                missing_fields = [
                    field
                    for field, value in [
                        ("sourceId", source_id),
                        ("s3Key", s3_key),
                        ("mimeType", mime_type),
                        ("jobKey", job_key),
                        ("embeddingModel", embedding_model),
                    ]
                    if not value
                ]
                raise ValueError(
                    f"Missing required fields: {', '.join(missing_fields)}"
                )

            return source_id, s3_key, mime_type, job_key, embedding_model

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON message format: {e}")
        except Exception as e:
            raise ValueError(f"Error parsing message: {e}")

    def process_file_message(self, ch, method, properties, body: bytes) -> None:
        """Process a single file message from the queue."""
        job_key = None
        source_id = None
        try:
            source_id, file_key, file_type, job_key, embedding_model = (
                self.parse_message_body(body)
            )
            self.info(
                f"Processing file: {file_key} (sourceId: {source_id}) with type: {file_type}",
                job_key=job_key,
                payload={"stage": "STARTING", "message": "Starting processing..."},
            )

            self.info(
                "Fetching file from S3...",
                job_key=job_key,
                payload={"stage": "FETCHING", "message": "Retrieving file..."},
            )
            obj = self.s3_bucket.Object(file_key)
            buffer = obj.get()["Body"].read()

            self.info(
                "Passing to handler for processing...",
                job_key=job_key,
                payload={"stage": "PARSING", "message": "Parsing file content..."},
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
                payload={
                    "stage": "VECTORIZING",
                    "message": f"Generating embeddings for {len(docs)} chunks...",
                },
            )
            save_text_chunks_as_vectors(
                docs, source_id, job_key, self.info, embedding_model
            )

            self.info(
                f"Successfully processed file: {file_key}",
                job_key=job_key,
                payload={"stage": "COMPLETED", "message": "Processing complete!"},
            )
            update_source_status(
                source_id,
                "COMPLETED",
                ingestor_type=f"{file_type}-handler",
                ingestor_version=manager.get_handler_version(file_type),
                embedding_model=embedding_model,
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            error_message = f"Fatal error processing message {body}: {e}"
            self.logger.error(error_message, method="process_file_message")
            if job_key:
                self.status_update(
                    job_key, {"stage": "FAILED", "message": str(e), "error": True}
                )
            if source_id:
                update_source_status(source_id, "FAILED", str(e))
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def start_consuming(self) -> None:
        """Start consuming messages from the queue."""
        self.channel.basic_consume(
            queue="file-processing",
            on_message_callback=self.process_file_message,
            auto_ack=False,
        )

        self.logger.info(
            "Waiting for messages. To exit press CTRL+C", method="start_consuming"
        )
        self.channel.start_consuming()

    def run(self) -> None:
        """Main entry point for the file ingestor."""
        self.logger.info("Starting file ingestor...", method="run")
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
        self.logger.info(
            f"Status update sent for job {job_key}: {payload}", method="status_update"
        )


def main():
    """Main function to run the file ingestor."""
    try:
        ingestor = FileIngestor()
        ingestor.run()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
