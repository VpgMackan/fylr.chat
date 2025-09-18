import structlog

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...entity import Summary
from ..base_generator import BaseGenerator
from ..database_helper import DatabaseHelper
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class SummaryGenerator(BaseGenerator, DatabaseHelper):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _create_summary(self, db: Session, channel: BlockingChannel, summary: Summary):
        """Generates summary content using the AI Gateway and updates the database."""
        log.info(
            f"Generating summary for '{summary.title}' (ID: {summary.id})",
            method="_create_summary",
        )
        self._publish_status(
            channel,
            summary.id,
            {
                "stage": "starting",
                "message": f"Starting summary generation for '{summary.title}'...",
            },
            "summary",
        )

        try:
            generated_episodes = []

            for episode in summary.episodes:
                log.info(
                    f"Processing episode: '{episode.title}'", method="_create_summary"
                )
                self._publish_status(
                    channel,
                    summary.id,
                    {
                        "stage": "episode_start",
                        "message": f"Generating content for episode: '{episode.title}'...",
                        "episodeId": episode.id,
                    },
                    "summary",
                )

                search_queries_text = ai_gateway_service.generate_text(
                    {
                        "prompt_type": "summary_keywords",
                        "prompt_version": "v1",
                        "prompt_vars": {
                            "episode_title": episode.title,
                            "focus": episode.focus,
                        },
                    }
                )
                search_queries = [
                    q.strip() for q in search_queries_text.split("\n") if q.strip()
                ]

                log.info(
                    f"Generated search queries: {search_queries}",
                    method="_create_summary",
                )

                all_related_docs = []
                for query in search_queries[:3]:
                    related_docs = self._fetch_related_documents(
                        db, query, summary.pocket_id, limit=5
                    )
                    all_related_docs.extend(related_docs)

                seen_ids = set()
                unique_docs = []
                for doc in all_related_docs:
                    if doc["vector_id"] not in seen_ids:
                        seen_ids.add(doc["vector_id"])
                        unique_docs.append(doc)

                unique_docs.sort(key=lambda x: x["similarity_distance"])
                top_docs = unique_docs[:10]

                if top_docs:
                    context_content = "\n\n".join(
                        [
                            f"Source: {doc['source_name']}\nContent: {doc['content']}"
                            for doc in top_docs
                        ]
                    )

                    episode_content = ai_gateway_service.generate_text(
                        {
                            "prompt_type": "episode_summary",
                            "prompt_version": "v1",
                            "prompt_vars": {
                                "episode_title": episode.title,
                                "focus": episode.focus,
                                "context_content": context_content,
                            },
                        }
                    )

                    episode.content = episode_content
                    log.info(
                        f"Generated content for episode '{episode.title}' ({len(episode_content)} characters)",
                        method="_create_summary",
                    )

                    self._publish_status(
                        channel,
                        summary.id,
                        {
                            "stage": "episode_complete",
                            "episode": {
                                "id": episode.id,
                                "title": episode.title,
                                "content": episode.content,
                                "focus": episode.focus,
                                "createdAt": episode.created_at.isoformat(),
                            },
                        },
                        "summary",
                    )

                    generated_episodes.append(
                        {
                            "title": episode.title,
                            "content": episode_content,
                            "sources_used": len(top_docs),
                        }
                    )
                else:
                    log.warning(
                        f"No relevant content found for episode '{episode.title}'",
                        method="_create_summary",
                    )
                    episode.content = f"No relevant content found for the topic '{episode.title}' in the available documents."
                    self._publish_status(
                        channel,
                        summary.id,
                        {
                            "stage": "episode_complete",
                            "episode": {
                                "id": episode.id,
                                "content": episode.content,
                                "title": episode.title,
                            },
                        },
                        "summary",
                    )

            # Mark summary as generated (boolean flag)
            if generated_episodes:
                summary.generated = "COMPLETED"
                log.info(
                    f"Successfully generated content for {len(generated_episodes)} episodes",
                    method="_create_summary",
                )
            else:
                summary.generated = "FAILED"
                log.warning(
                    "No content generated for any episodes", method="_create_summary"
                )

            self._publish_status(
                channel,
                summary.id,
                {
                    "stage": "complete",
                    "message": "Summary generation finished.",
                    "finalStatus": summary.generated,
                },
                "summary",
            )

            db.commit()
            log.info(
                f"Successfully saved summary episodes to database",
                method="_create_summary",
            )

        except Exception as e:
            log.error(
                f"Error generating summary content: {e}",
                exc_info=True,
                method="_create_summary",
            )
            summary.generated = "FAILED"
            db.commit()
            self._publish_status(
                channel,
                summary.id,
                {
                    "stage": "error",
                    "message": "An error occurred during summary generation.",
                },
                "summary",
            )
            db.rollback()
            raise

    def generate(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        """Processes a summary generation request."""
        self._process_message(
            db,
            channel,
            method,
            properties,
            body,
            Summary,
            self._create_summary,
            "summary",
        )
