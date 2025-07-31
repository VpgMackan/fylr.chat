import logging
import uuid
from typing import List, Dict, Any

from sqlalchemy.orm import Session, joinedload
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...entity import Summary, Source
from ..base_generator import BaseGenerator
from ...services.ai_gateway_service import ai_gateway_service
from .prompts import create_summary_prompt

logger = logging.getLogger(__name__)


class SummaryGenerator(BaseGenerator):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _fetch_related_documents(
        self, db: Session, pocket_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """
        Fetches and consolidates content from all sources within a pocket.
        """
        logger.info(f"Fetching sources for pocket_id: {pocket_id}")

        sources = (
            db.query(Source)
            .options(joinedload(Source.vectors))
            .filter(Source.pocket_id == pocket_id)
            .all()
        )

        documents = []
        for source in sources:
            if not source.vectors:
                continue

            sorted_chunks = sorted(source.vectors, key=lambda v: v.chunk_index)
            full_content = " ".join([chunk.content for chunk in sorted_chunks])

            documents.append(
                {"id": source.id, "name": source.name, "content": full_content}
            )

        logger.info(
            f"Found {len(documents)} documents with content for pocket {pocket_id}"
        )
        return documents

    def _create_summary(
        self, db: Session, summary: Summary, documents: List[Dict[str, Any]]
    ):
        """Generates summary content using the AI Gateway and updates the database."""
        logger.info(f"Generating summary for '{summary.title}' (ID: {summary.id})")

        prompt = create_summary_prompt(documents, summary.title)

        try:
            generated_content = ai_gateway_service.generate_text(prompt)
        except Exception as e:
            logger.error(f"Failed to generate summary content for {summary.id}: {e}")
            summary.generated = "Error: Failed to communicate with the AI service."
            db.add(summary)
            return

        if generated_content:
            summary.generated = generated_content
            logger.info(f"Successfully generated content for summary {summary.id}")
        else:
            summary.generated = "Failed: AI service returned an empty response."
            logger.warning(
                f"AI service returned empty content for summary {summary.id}"
            )

        db.add(summary)

    def generate(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        """Processes a summary generation request."""
        try:
            summary_id = body.decode("utf-8")
            uuid.UUID(summary_id)
        except (ValueError, UnicodeDecodeError) as e:
            logger.error(
                f"Invalid message body, expecting a UUID string. Got '{body}'. Error: {e}"
            )
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        logger.info(f"Processing summary request for ID: {summary_id}")

        try:
            summary = (
                db.query(Summary)
                .options(joinedload(Summary.episodes))
                .filter(Summary.id == summary_id)
                .first()
            )
            if not summary:
                logger.warning(f"Summary with ID {summary_id} not found in database.")
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            documents = self._fetch_related_documents(db, summary.pocket_id)
            if not documents:
                logger.warning(
                    f"No documents found for summary {summary_id}, cannot generate."
                )
                summary.generated = (
                    "Failed: No source documents with content were found in the pocket."
                )
                db.add(summary)
                channel.basic_ack(delivery_tag=method.delivery_tag)
                return

            self._create_summary(db, summary, documents)

            logger.info(f"Successfully processed and updated summary ID: {summary_id}")
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            logger.error(
                f"Error during summary processing for ID {summary_id}: {e}",
                exc_info=True,
            )
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
