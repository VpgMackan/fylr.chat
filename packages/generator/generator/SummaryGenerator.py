import pika
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .entity import Base, Summary
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

    def process_summary(self, ch, method, properties, body: bytes) -> None:
        try:
            summary_id_str = body.decode("utf-8")
            uuid.UUID(summary_id_str)
            print(f"Processing summary ID: {summary_id_str}")

            summary = self.session.get(Summary, summary_id_str)
            if summary:
                print(f"Found summary: {summary.title}")
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
