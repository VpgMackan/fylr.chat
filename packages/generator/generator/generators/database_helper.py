import uuid
import structlog
from typing import List, Dict, Any

from abc import ABC
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from ..entity import Source, DocumentVector
from ..services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class DatabaseHelper(ABC):
    def _fetch_related_documents(
        self, db: Session, query_text: str, source_ids: List[str], limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Performs vector search to find documents related to the query text within a specific set of sources.

        Args:
            db: Database session
            query_text: The search query text
            source_ids: List of source IDs to filter the search
            limit: Maximum number of results to return

        Returns:
            List of dictionaries containing document content and metadata
        """
        log.info(
            f"Performing vector search for query: '{query_text}' in selected sources",
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
                .filter(Source.id.in_(source_ids))
                .order_by(DocumentVector.embedding.cosine_distance(query_embedding))
                .limit(limit)
            )

            result = db.execute(query).fetchall()

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

    def _fetch_sources_with_vectors(
        self, db: Session, source_ids: List[str]
    ) -> List[Source]:
        """
        Fetches all sources with their vectors for a given list of source IDs.

        Args:
            db: Database session
            source_ids: List of source IDs to filter the sources

        Returns:
            List of Source objects with loaded vectors
        """
        log.info(
            f"Fetching sources with vectors for selected sources",
            method="_fetch_sources_with_vectors",
        )

        sources = (
            db.query(Source)
            .options(joinedload(Source.vectors))
            .filter(Source.id.in_(source_ids))
            .all()
        )

        log.info(
            f"Found {len(sources)} sources for selected source IDs",
            method="_fetch_sources_with_vectors",
        )
        return sources
