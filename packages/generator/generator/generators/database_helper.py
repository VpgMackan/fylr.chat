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

    def _fetch_sources_with_vectors(
        self, db: Session, pocket_id: uuid.UUID
    ) -> List[Source]:
        """
        Fetches all sources with their vectors for a given pocket.

        Args:
            db: Database session
            pocket_id: The pocket ID to fetch sources for

        Returns:
            List of Source objects with loaded vectors
        """
        log.info(
            f"Fetching sources with vectors for pocket_id: {pocket_id}",
            method="_fetch_sources_with_vectors",
        )

        sources = (
            db.query(Source)
            .options(joinedload(Source.vectors))
            .filter(Source.pocket_id == pocket_id)
            .all()
        )

        log.info(
            f"Found {len(sources)} sources for pocket {pocket_id}",
            method="_fetch_sources_with_vectors",
        )
        return sources
