import structlog
import uuid
import json
from typing import List, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, select
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties
import pika

from ...entity import Source, DocumentVector
from ..base_generator import BaseGenerator
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class PodcastGenerator(BaseGenerator):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _publish_status(
        self,
        channel: BlockingChannel,
        podcast_id: str,
        payload: dict,
    ):
        """Publishes a status update message to the events exchange."""
        routing_key = f"podcast.{podcast_id}.status"
        try:
            channel.basic_publish(
                exchange="fylr-events",
                routing_key=routing_key,
                body=json.dumps(payload),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,
                ),
            )
            log.info(
                f"Published status to {routing_key}: {payload.get('stage')}", method=""
            )
        except Exception as e:
            log.error(
                f"Failed to publish status update for podcast {podcast_id}: {e}",
                method="",
            )

    def _fetch_all_documents(
        self, db: Session, pocket_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        pass

    def _fetch_related_documents(
        self, db: Session, query_text: str, pocket_id: uuid.UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        pass

    def _create_podcast(self, db: Session, channel: BlockingChannel):
        pass

    def generate(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        """Processes a podcast generation request."""
        pass
