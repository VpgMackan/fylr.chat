import structlog

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...entity import Podcast
from ..base_generator import BaseGenerator
from ..vector_helper import VectorHelper

log = structlog.getLogger(__name__)


class PodcastGenerator(BaseGenerator, VectorHelper):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _create_podcast(self, db: Session, channel: BlockingChannel, podcast: Podcast):
        """Generates podcast using the AI Gateway and updates the database."""
        log.info(
            f"Generating podcast for '{podcast.title}' (ID: {podcast.id})",
            method="_create_podcast",
        )
        self._publish_status(
            channel,
            podcast.id,
            {
                "stage": "starting",
                "message": f"Starting podcast generation for '{podcast.title}'...",
            },
            "podcast",
        )

        vectors = self._fetch_all_documents(db, podcast.pocket_id)

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
