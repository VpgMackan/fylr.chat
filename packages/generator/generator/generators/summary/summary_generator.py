import json
import logging
import uuid

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...entity import Summary
from ..base_generator import BaseGenerator

logger = logging.getLogger(__name__)


class SummaryGenerator(BaseGenerator):
    def validate_input(self, input_data: dict):
        """Validates that the input contains a valid 'summary_id'."""
        summary_id = input_data.get("summary_id")
        if not summary_id:
            logger.error("Validation failed: 'summary_id' is missing.")
            return False
        try:
            uuid.UUID(summary_id)
            return True
        except ValueError:
            logger.error(f"Validation failed: '{summary_id}' is not a valid UUID.")
            return False

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
            # For now, we assume body is a simple string of the ID
            summary_id_str = body.decode("utf-8")
            uuid.UUID(summary_id_str)  # Validate it's a UUID
        except (ValueError, UnicodeDecodeError) as e:
            logger.error(f"Invalid message body, expecting a UUID string: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        logger.info(f"Processing summary request for ID: {summary_id_str}")

        try:
            summary = db.query(Summary).filter(Summary.id == summary_id_str).first()
            if not summary:
                logger.warning(
                    f"Summary with ID {summary_id_str} not found in database."
                )
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            # --- Placeholder for actual generation logic ---
            # In a real scenario, you would:
            # 1. Fetch related documents/vectors from the database using summary.pocket_id.
            # 2. Construct a prompt for an AI service.
            # 3. Call the AI service and get the generated summary text.
            # 4. Update the summary record with the content.
            logger.info(
                f"Successfully fetched summary '{summary.title}'. Skipping actual AI generation as per instructions."
            )

            logger.info(f"Successfully processed summary ID: {summary_id_str}")
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            logger.error(
                f"An error occurred during summary processing for ID {summary_id_str}: {e}",
                exc_info=True,
            )
            # Do not requeue to avoid poison pill messages
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


'''
    def fetch_sources(self, pocket_id):
        """
        Get all the vectors grouped by source and chunkIndex and store them in an array like this:
        [{id, name, type, url, content}, .....]
        Content is all the vectors joined together based on chunkIndex
        """

        try:
            sources = (
                self.session.query(Source)
                .options(joinedload(Source.vectors))
                .filter(Source.pocket_id == pocket_id)
                .all()
            )

            result = []

            for source in sources:
                vectors_by_chunk = defaultdict(list)
                for vector in source.vectors:
                    vectors_by_chunk[vector.chunk_index].append(vector.content)

                sorted_chunks = sorted(vectors_by_chunk.items())
                content_parts = []
                for chunk_index, contents in sorted_chunks:
                    chunk_content = " ".join(contents)
                    content_parts.append(chunk_content)

                full_content = " ".join(content_parts)

                source_entry = {
                    "id": source.id,
                    "name": source.name,
                    "type": source.type,
                    "url": source.url,
                    "content": full_content,
                }

                result.append(source_entry)

            print(f"Found {len(result)} sources for pocket {pocket_id}")
            return result

        except Exception as e:
            print(f"Error fetching sources for pocket {pocket_id}: {e}")
            raise

    def process_summary(self, ch, method, properties, body: bytes) -> None:
        try:
            summary_id_str = body.decode("utf-8")
            uuid.UUID(summary_id_str)
            print(f"Processing summary ID: {summary_id_str}")

            summary = self.session.get(Summary, summary_id_str)
            if summary:
                print(f"Found summary: {summary.title}")
                print(self.fetch_sources(summary.pocket_id))
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"Summary with ID {summary_id_str} not found")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except ValueError as e:
            print(f"Invalid UUID format: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            print(f"Error processing summary: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
'''
