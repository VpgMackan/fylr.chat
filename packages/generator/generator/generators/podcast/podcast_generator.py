import structlog
import uuid
import json
from typing import List, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, select
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties
import pika

from ...entity import Podcast, Source, DocumentVector
from ..base_generator import BaseGenerator
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class PodcastGenerator(BaseGenerator):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _fetch_all_documents(
        self, db: Session, pocket_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        pass

    def _fetch_related_documents(
        self, db: Session, query_text: str, pocket_id: uuid.UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        pass

    def _create_podcast(self, db: Session, channel: BlockingChannel, podcast: Podcast):
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
        self._process_message(
            db,
            channel,
            method,
            properties,
            body,
            Podcast,
            self._create_podcast,
            "podcast",
        )
