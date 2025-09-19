import structlog

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...entity import Podcast
from ..base_generator import BaseGenerator
from ..vector_helper import VectorHelper
from ..database_helper import DatabaseHelper
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class PodcastGenerator(BaseGenerator, DatabaseHelper, VectorHelper):
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

        sources = self._fetch_sources_with_vectors(db, podcast.pocket_id)
        groups = self._cluster_source_vector(sources)

        for group in groups:
            log.info(
                f"Processing group with {len(group)} sources", method="_create_podcast"
            )
            content_snippets = "\n".join([source.content for source in group[:5]])
            prompt = f"""You will recive a group of text snippets from various documents. Your task is to create keynotes, extract facts and create a detailed title for the podcast episode based on the content provided. Make sure that your response is in JSON format with the following structure:
{{
    "title": "Detailed and engaging title for the podcast episode",
    "keynotes": [
        "First keynote point",
        "Second keynote point",
        "... more keynotes ..."
    ],
    "facts": [
        "First interesting fact",
        "Second interesting fact",
        "... more facts ..."
    ]
}}
The content snippets are as follows:
{content_snippets}
Please ensure that the JSON is properly formatted and valid.
"""
            response = ai_gateway_service.generate_text(prompt)
            log.info(f"AI Gateway response: {response}", method="_create_podcast")

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
