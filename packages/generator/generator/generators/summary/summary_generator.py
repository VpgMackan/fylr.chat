import structlog
import uuid
import json
from typing import List, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, select
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties
import pika

from ...entity import Summary, Source, DocumentVector
from ..base_generator import BaseGenerator
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class SummaryGenerator(BaseGenerator):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _publish_status(
        self,
        channel: BlockingChannel,
        summary_id: str,
        payload: dict,
    ):
        """Publishes a status update message to the events exchange."""
        routing_key = f"summary.{summary_id}.status"
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
                f"Failed to publish status update for summary {summary_id}: {e}",
                method="",
            )

    def _fetch_all_documents(
        self, db: Session, pocket_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """
        Fetches and consolidates content from all sources within a pocket.
        """
        log.info(
            f"Fetching sources for pocket_id: {pocket_id}",
            method="_fetch_all_documents",
        )

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

        log.info(
            f"Found {len(documents)} documents with content for pocket {pocket_id}",
            method="_fetch_all_documents",
        )
        return documents

    def _fetch_related_documents(
        self, db: Session, query_text: str, pocket_id: uuid.UUID, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Performs vector search to find documents related to the query text within a specific pocket.

        Args:
            db: Database session
            query_text: The search query text
            pocket_id: The pocket ID to limit search to
            limit: Maximum number of results to return

        Returns:
            List of dictionaries containing document content and metadata
        """
        log.info(
            f"Performing vector search for query: '{query_text}' in pocket {pocket_id}",
            method="_fetch_related_documents",
        )

        try:
            # Generate embedding for the search query
            query_embedding = ai_gateway_service.generate_embeddings(query_text)

            # Use SQLAlchemy scalars with pgvector cosine distance
            query = (
                select(
                    DocumentVector.id,
                    DocumentVector.content,
                    DocumentVector.chunk_index,
                    Source.id.label("source_id"),
                    Source.name.label("source_name"),
                    DocumentVector.embedding.cosine_distance(query_embedding).label(
                        "distance"
                    ),
                )
                .join(Source, DocumentVector.file_id == Source.id)
                .filter(Source.pocket_id == str(pocket_id))
                .order_by(DocumentVector.embedding.cosine_distance(query_embedding))
                .limit(limit)
            )

            result = db.execute(query).fetchall()

            # Convert results to a more usable format
            related_docs = []
            for row in result:
                related_docs.append(
                    {
                        "vector_id": row.id,
                        "content": row.content,
                        "chunk_index": row.chunk_index,
                        "source_id": row.source_id,
                        "source_name": row.source_name,
                        "similarity_distance": float(row.distance),
                    }
                )

            log.info(
                f"Found {len(related_docs)} related documents",
                method="_fetch_related_documents",
            )
            return related_docs

        except Exception as e:
            log.error(
                f"Error during vector search: {e}",
                exc_info=True,
                method="_fetch_related_documents",
            )
            return []

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
        try:
            # Decode the body and parse JSON since the backend sends JSON.stringify(data)
            body_str = body.decode("utf-8")
            summary_id = json.loads(body_str)  # This will remove the extra quotes
            uuid.UUID(summary_id)
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as e:
            log.error(
                f"Invalid message body, expecting a JSON-serialized UUID string. Got '{body}'. Error: {e}",
                method="generate",
            )
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        log.info(f"Processing summary request for ID: {summary_id}", method="generate")

        try:
            summary = (
                db.query(Summary)
                .options(joinedload(Summary.episodes))
                .filter(Summary.id == summary_id)
                .first()
            )
            if not summary:
                log.warning(
                    f"Summary with ID {summary_id} not found in database.",
                    method="generate",
                )
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            self._create_summary(db, channel, summary)

            log.info(
                f"Successfully processed and updated summary ID: {summary_id}",
                method="generate",
            )
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            log.error(
                f"Error during summary processing for ID {summary_id}: {e}",
                exc_info=True,
                method="generate",
            )
            # Requeueing might cause loops if the error is persistent
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
