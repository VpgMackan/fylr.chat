from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties


class BaseGenerator(ABC):
    @abstractmethod
    def generate(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        """
        Processes a message to generate content.

        This method is responsible for the entire lifecycle of a message,
        including parsing, processing, and acknowledging or rejecting it.
        """
        pass

    @abstractmethod
    def validate_input(self, input_data: dict) -> bool:
        """Validates the input data from the message body."""
        pass
