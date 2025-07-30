import pika

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, joinedload

from .generator_service import GeneratorService

from .config import settings


class Generator:
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

    def start_consuming(self) -> None:
        service = GeneratorService()
        summary_generator = service.get_generator("summary")

        self.channel.basic_consume(
            queue="summary-generator",
            on_message_callback=summary_generator.generate,
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


def main():
    try:
        generator = Generator()
        generator.run()
    except Exception as e:
        print(e)
