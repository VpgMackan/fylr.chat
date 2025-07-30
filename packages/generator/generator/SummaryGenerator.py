import pika
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, joinedload

from collections import defaultdict

from .entity import Base, Summary, Source
from .config import settings


class SummaryGenerator:
    def __init__(self):
        self.channel = None
        self.engine = None
        self.Session = None
        self.session = None

    def setup_database(self, db_url: str) -> None:
        """Initialize database connection and session."""
        self.engine = create_engine(db_url, echo=False)
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()

    def setup_rabbitmq_connection(self) -> None:
        """Initialize RabbitMQ connection and channel."""
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
            self.channel = connection.channel()
            self.channel.queue_declare("summary-generator", durable=True)
            print("RabbitMQ connection established successfully")
        except Exception as e:
            print(f"Failed to connect to RabbitMQ: {e}")
            raise

    def fetch_sources(self, pocket_id):
        """
        Get all the vectors grouped by source and chunkIndex and store them in an array like this:
        [{id, name, type, url, content}, .....]
        Content is all the vectors joined together based on chunkIndex
        """

        try:
            sources = (
                self.session.query(Source)
                .options(joinedload(Source.vectors))
                .filter(Source.pocket_id == pocket_id)
                .all()
            )

            result = []

            for source in sources:
                vectors_by_chunk = defaultdict(list)
                for vector in source.vectors:
                    vectors_by_chunk[vector.chunk_index].append(vector.content)

                sorted_chunks = sorted(vectors_by_chunk.items())
                content_parts = []
                for chunk_index, contents in sorted_chunks:
                    chunk_content = " ".join(contents)
                    content_parts.append(chunk_content)

                full_content = " ".join(content_parts)

                source_entry = {
                    "id": source.id,
                    "name": source.name,
                    "type": source.type,
                    "url": source.url,
                    "content": full_content,
                }

                result.append(source_entry)

            print(f"Found {len(result)} sources for pocket {pocket_id}")
            return result

        except Exception as e:
            print(f"Error fetching sources for pocket {pocket_id}: {e}")
            raise

    def process_summary(self, ch, method, properties, body: bytes) -> None:
        try:
            summary_id_str = body.decode("utf-8")
            uuid.UUID(summary_id_str)
            print(f"Processing summary ID: {summary_id_str}")

            summary = self.session.get(Summary, summary_id_str)
            if summary:
                print(f"Found summary: {summary.title}")
                print(self.fetch_sources(summary.pocket_id))
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"Summary with ID {summary_id_str} not found")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except ValueError as e:
            print(f"Invalid UUID format: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            print(f"Error processing summary: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def start_consuming(self) -> None:
        self.channel.basic_consume(
            queue="summary-generator",
            on_message_callback=self.process_summary,
            auto_ack=False,
        )
        self.channel.start_consuming()

    def run(self) -> None:
        try:
            db_url = f"postgresql://{settings.db_user}:{settings.db_pass}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
            print(f"Connecting to database...")
            self.setup_database(db_url)
            print("Database connection established successfully")

            print("Setting up RabbitMQ connection...")
            self.setup_rabbitmq_connection()

            print("Starting to consume messages...")
            self.start_consuming()
        except KeyboardInterrupt:
            print("Stopping consumer...")
            if self.channel:
                self.channel.stop_consuming()
            if self.session:
                self.session.close()
        except Exception as e:
            print(f"Error in run method: {e}")
            if self.session:
                self.session.close()
            raise
