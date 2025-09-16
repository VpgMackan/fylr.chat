import json
import structlog

from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

log = structlog.getLogger(__name__)


class BaseGenerator(ABC):
    def _publish_status(
        self,
        channel: BlockingChannel,
        entity_id: str,
        payload: dict,
        entity_type: str,
    ):
        """Publishes a status update message to the events exchange."""
        routing_key = f"{entity_type}.{entity_id}.status"
        try:
            channel.basic_publish(
                exchange="fylr-events",
                routing_key=routing_key,
                body=json.dumps(payload),
                properties=BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,
                ),
            )
            log.info(
                f"Published status to {routing_key}: {payload.get('stage')}", method=""
            )
        except Exception as e:
            log.error(
                f"Failed to publish status update for {entity_type} {entity_id}: {e}",
                method="",
            )

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
        return True

    @abstractmethod
    def validate_input(self, input_data: dict) -> bool:
        """Validates the input data from the message body."""
        pass
