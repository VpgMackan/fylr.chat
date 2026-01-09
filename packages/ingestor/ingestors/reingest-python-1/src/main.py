import os
import pika
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
import logging

# Load environment variables BEFORE importing database module
load_dotenv()

from .database import get_db_session, Source, DocumentVector
from .telemetry import setup_telemetry

QUEUE_NAME = os.getenv("INGESTOR_QUEUE_NAME")
FILE_EXCHANGE_NAME = "file-processing-exchange"
EVENTS_EXCHANGE_NAME = "fylr-events"

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")

AI_GATEWAY_URL = os.getenv("AI_GATEWAY_URL")

SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "text-ingestor")
setup_telemetry(SERVICE_NAME)
logger = logging.getLogger(__name__)

if not all([QUEUE_NAME, AI_GATEWAY_URL]):
    sys.exit("Error: Missing one or more required environment variables.")


STATUS_IN_PROGRESS = "in_progress"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


def publish_status(channel, job_key, stage, message, error=False):
    """Publishes a status update to the fylr-events exchange."""
    payload = {"stage": stage, "message": message, "error": error}
    routing_key = f"job.{job_key}.status"
    channel.basic_publish(
        exchange=EVENTS_EXCHANGE_NAME,
        routing_key=routing_key,
        body=json.dumps({"eventName": "jobStatusUpdate", "payload": payload}),
        properties=pika.BasicProperties(delivery_mode=2),
    )
    logger.info(
        "Job status update",
        extra={
            "job_key": job_key,
            "stage": stage,
            "status_message": message,
            "error": error,
        },
    )


def get_embeddings(chunks: list[str], embedding_model: str) -> list[list[float]]:
    """Calls the AI Gateway passing the full model string as-is."""
    response = requests.post(
        f"{AI_GATEWAY_URL}/v1/embeddings",
        json={"fullModel": embedding_model, "input": chunks, "options": {}},
    )
    response.raise_for_status()
    return [item["embedding"] for item in response.json()["data"]]


def main():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=RABBITMQ_HOST, port=RABBITMQ_PORT, credentials=credentials
        )
    )
    channel = connection.channel()

    channel.exchange_declare(
        exchange=EVENTS_EXCHANGE_NAME, exchange_type="topic", durable=True
    )
    channel.exchange_declare(
        exchange=FILE_EXCHANGE_NAME, exchange_type="topic", durable=True
    )
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_bind(
        exchange=FILE_EXCHANGE_NAME, queue=QUEUE_NAME, routing_key="reingest.v1"
    )

    logger.info("Ingestor online", extra={"queue": QUEUE_NAME})

    def callback(ch, method, properties, body):
        message = json.loads(body)
        source_id = message.get("sourceId")
        job_key = message.get("jobKey")
        embedding_model = message.get("targetEmbeddingModel")

        if not embedding_model:
            logger.error(
                "Missing embeddingModel in message", extra={"job_key": job_key}
            )
            publish_status(
                ch,
                job_key,
                "FAILED",
                "embeddingModel not provided in message",
                error=True,
            )
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        try:
            publish_status(ch, job_key, "STARTINGS_REINGEST", "Re-ingestion started.")

            with get_db_session() as db:
                publish_status(
                    ch,
                    job_key,
                    "FETCHING_CHUNKS",
                    "Fetching existing chunks from database.",
                )

                source = db.query(Source).filter(Source.id == source_id).one_or_none()
                if not source:
                    raise ValueError(f"Source not found for ID: {source_id}")

                existing_vectors = (
                    db.query(DocumentVector)
                    .filter(DocumentVector.file_id == source_id)
                    .order_by(DocumentVector.chunk_index)
                    .all()
                )

                if not existing_vectors:
                    raise ValueError(
                        f"No existing vectors found for source ID: {source_id}"
                    )

                if (
                    source.reingestion_status == STATUS_COMPLETED
                    and source.status == "COMPLETED"
                ):
                    publish_status(
                        ch,
                        job_key,
                        "SKIPPED",
                        "Re-ingestion already completed; skipping.",
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                source.reingestion_status = STATUS_IN_PROGRESS
                source.reingestion_started_at = datetime.utcnow()

                chunks = [v.content for v in existing_vectors]

                publish_status(
                    ch,
                    job_key,
                    "VECTORIZING",
                    f"Generating embeddings for {len(chunks)} chunks.",
                )

                new_embeddings = get_embeddings(chunks, embedding_model)
                if len(new_embeddings) != len(existing_vectors):
                    raise Exception(
                        "Mismatch between number of embeddings and existing vectors."
                    )

                publish_status(
                    ch, job_key, "SAVING", "Updating embeddings in database."
                )
                for i, vector in enumerate(existing_vectors):
                    vector.embedding = new_embeddings[i]

                source.status = "COMPLETED"
                source.reingestion_status = STATUS_COMPLETED
                source.reingestion_completed_at = datetime.utcnow()

            publish_status(
                ch, job_key, "COMPLETED", "Processing finished successfully."
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            logger.exception(
                "Error processing message",
                extra={"source_id": source_id, "error": str(e)},
            )
            publish_status(ch, job_key, "FAILED", str(e), error=True)
            with get_db_session() as db:
                source = db.query(Source).filter(Source.id == source_id).first()
                if source:
                    source.status = "FAILED"
                    source.reingestion_status = STATUS_FAILED
                    source.reingestion_completed_at = datetime.utcnow()
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    channel.start_consuming()


if __name__ == "__main__":
    main()
