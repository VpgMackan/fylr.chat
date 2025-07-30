import logging
import requests
import os
from typing import List, Dict, Any, Optional, Generator
from contextlib import contextmanager

from langchain_core.documents import Document
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from .entity import DocumentVector
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()


def get_database_url() -> str:
    """Get database URL from environment variables with validation."""
    required_vars = ["DB_USER", "DB_PASS", "DB_HOST", "DB_PORT", "DB_NAME"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        raise ValueError(f"Missing required environment variables: {missing_vars}")

    return f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"


try:
    DATABASE_URL = get_database_url()
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=os.getenv("DB_ECHO", "false").lower() == "true",
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    raise


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for database sessions."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def fetch_embeddings_from_ai_gateway(
    chunks: List[str],
    job_key: str,
    info_callback: callable,
    model: str = "jina-clip-v2",
    options: Optional[Dict[str, Any]] = None,
) -> List[List[float]]:
    """
    Fetch embeddings from AI Gateway for multiple text chunks.
    """
    if not chunks:
        raise ValueError("No chunks provided for embedding")

    options = options or {}
    request_payload = {
        "provider": "jina",
        "model": model,
        "input": chunks,
        "options": options,
    }

    info_callback(
        f"Requesting embeddings for {len(chunks)} chunks from AI Gateway...", job_key
    )

    ai_gateway_url = os.getenv("AI_GATEWAY_URL")
    if not ai_gateway_url:
        raise ValueError("AI_GATEWAY_URL environment variable is required")

    try:
        response = requests.post(
            f"{ai_gateway_url}/v1/embeddings",
            json=request_payload,
            timeout=30,
        )
        response.raise_for_status()

        response_data = response.json()

        if "data" not in response_data or not isinstance(response_data["data"], list):
            logger.error(f"Unexpected response structure: {response_data}")
            raise ValueError("Invalid response structure from AI Gateway")

        embeddings = []
        for item in response_data["data"]:
            if "embedding" not in item:
                raise ValueError("Missing embedding in response data")
            embeddings.append(item["embedding"])

        info_callback(f"Successfully received {len(embeddings)} embeddings.", job_key)
        return embeddings

    except requests.exceptions.RequestException as e:
        error_msg = f"AI Gateway request failed: {str(e)}"
        info_callback(error_msg, job_key, {"error": True, "message": error_msg})
        logger.error(error_msg)
        raise
    except Exception as e:
        error_msg = f"Unexpected error during AI Gateway call: {str(e)}"
        info_callback(error_msg, job_key, {"error": True, "message": error_msg})
        logger.error(error_msg)
        raise


def vectorize_text(
    chunks: List[str], job_key: str, info_callback: callable
) -> List[List[float]]:
    """Convert text chunks to embeddings."""
    if not chunks:
        raise ValueError("No chunks provided for vectorization")

    info_callback("Starting vectorization process...", job_key)
    return fetch_embeddings_from_ai_gateway(
        chunks, job_key, info_callback, "jina-clip-v2", {}
    )


def save_text_chunks_as_vectors(
    docs: List[Document], file_id: str, job_key: str, info_callback: callable
) -> List[DocumentVector]:
    """Save text chunks as vectors in the database."""
    if not docs:
        raise ValueError("No documents provided")

    if not file_id:
        raise ValueError("File ID is required")

    chunks = [doc.page_content for doc in docs]

    try:
        embeddings = vectorize_text(chunks, job_key, info_callback)

        info_callback(f"Saving {len(embeddings)} vectors to the database...", job_key)
        with get_db_session() as session:
            vectors = []
            for i, (doc, embedding) in enumerate(zip(docs, embeddings)):
                start_index = doc.metadata.get("start_index")
                vector = DocumentVector(
                    file_id=file_id,
                    content=doc.page_content,
                    embedding=embedding,
                    chunk_index=start_index if start_index is not None else i,
                )
                vectors.append(vector)

            session.add_all(vectors)
            message = f"Successfully saved {len(vectors)} vectors for file {file_id}"
            info_callback(
                message, job_key, {"saved_vectors": len(vectors), "message": message}
            )
            logger.info(message)
            return vectors

    except SQLAlchemyError as e:
        error_msg = f"Database error while saving vectors: {str(e)}"
        info_callback(error_msg, job_key, {"error": True, "message": error_msg})
        logger.error(error_msg)
        raise
    except Exception as e:
        error_msg = f"Failed to save vectors: {str(e)}"
        info_callback(error_msg, job_key, {"error": True, "message": error_msg})
        logger.error(error_msg)
        raise
