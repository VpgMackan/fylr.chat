import json, uuid
import structlog

from abc import ABC, abstractmethod
from sqlalchemy.orm import Session, joinedload
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
            # Check if channel is still open before publishing
            if not channel.is_open:
                log.warning(
                    f"Channel is closed, cannot publish status update for {entity_type} {entity_id}",
                    method="",
                )
                return

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

    def _process_message(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
        model,
        create_fn,
        log_label: str,
    ) -> None:
        """Generic message processor for DB objects with UUID IDs."""
        try:
            body_str = body.decode("utf-8")
            obj_id = json.loads(body_str)
            uuid.UUID(obj_id)
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as e:
            log.error(
                f"Invalid message body, expecting a JSON-serialized UUID string. Got '{body}'. Error: {e}",
                method=log_label,
            )
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        log.info(f"Processing {log_label} request for ID: {obj_id}", method=log_label)

        try:
            obj = (
                db.query(model)
                .options(joinedload(getattr(model, "episodes", None)))  # optional
                .filter(model.id == obj_id)
                .first()
            )
            if not obj:
                log.warning(
                    f"{log_label.capitalize()} with ID {obj_id} not found in database.",
                    method=log_label,
                )
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            create_fn(db, channel, obj)

            log.info(
                f"Successfully processed and updated {log_label} ID: {obj_id}",
                method=log_label,
            )

            # Check if channel is still open before acking
            if channel.is_open:
                channel.basic_ack(delivery_tag=method.delivery_tag)
            else:
                log.warning(
                    f"Channel closed before ack for {log_label} ID: {obj_id}. Message may be redelivered.",
                    method=log_label,
                )

        except Exception as e:
            log.error(
                f"Error during {log_label} processing for ID {obj_id}: {e}",
                exc_info=True,
                method=log_label,
            )
            # Check if channel is still open before nacking
            if channel.is_open:
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            else:
                log.warning(
                    f"Channel closed before nack for {log_label} ID: {obj_id}. Message may be redelivered.",
                    method=log_label,
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
