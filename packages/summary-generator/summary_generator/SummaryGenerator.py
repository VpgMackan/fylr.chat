import pika


class SummaryGenerator:
    def __init__(self):
        self.channel = None

    def setup_rabbitmq_connection(self) -> None:
        """Initialize RabbitMQ connection and channel."""
        connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
        self.channel = connection.channel()
        self.channel.queue_declare("summary-generator", durable=True)

    def process_summary(self, ch, method, properties, body: bytes) -> None:
        print(body.decode("utf-8"))

    def start_consuming(self) -> None:
        self.channel.basic_consume(
            queue="summary-generator",
            on_message_callback=self.process_summary,
            auto_ack=False,
        )
        self.channel.start_consuming()

    def run(self) -> None:
        self.setup_rabbitmq_connection()
        self.start_consuming()
