import logging
import requests
import os
from typing import List, Dict, Any, Optional, Generator
from contextlib import contextmanager

from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from vector.entity import Vector, Base
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


def fetch_embeddings_from_jina(
    chunks: List[str],
    model: str = "jina-clip-v2",
    jina_api_options: Optional[Dict[str, Any]] = None,
    task: Optional[str] = None,
) -> List[List[float]]:
    """
    Fetch embeddings from Jina API for multiple text chunks.
    """
    if not chunks:
        raise ValueError("No chunks provided for embedding")

    jina_api_options = jina_api_options or {}
    input_data = [{"text": chunk} for chunk in chunks]
    request_payload = {"model": model, "input": input_data, **jina_api_options}

    if task:
        request_payload["task"] = task

    jina_api_key = os.getenv("JINA_API_KEY")
    jina_api_url = os.getenv("JINA_API_URL")

    if not jina_api_key:
        raise ValueError("JINA_API_KEY environment variable is required")
    if not jina_api_url:
        raise ValueError("JINA_API_URL environment variable is required")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {jina_api_key}",
    }

    try:
        response = requests.post(
            f"{jina_api_url}/embeddings",
            json=request_payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()

        response_data = response.json()

        if "data" not in response_data or not isinstance(response_data["data"], list):
            logger.error(f"Unexpected response structure: {response_data}")
            raise ValueError("Invalid response structure from Jina API")

        embeddings = []
        for item in response_data["data"]:
            if "embedding" not in item:
                raise ValueError("Missing embedding in response data")
            embeddings.append(item["embedding"])

        return embeddings

    except requests.exceptions.RequestException as e:
        logger.error(f"Jina API request failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Jina API call: {str(e)}")
        raise


def vectorize_text(chunks: List[str]) -> List[List[float]]:
    """Convert text chunks to embeddings."""
    if not chunks:
        raise ValueError("No chunks provided for vectorization")

    return fetch_embeddings_from_jina(chunks, "jina-clip-v2", {})


def save_text_chunks_as_vectors(chunks: List[str], file_id: str) -> List[Vector]:
    """Save text chunks as vectors in the database."""
    if not chunks:
        raise ValueError("No chunks provided")

    if not file_id:
        raise ValueError("File ID is required")

    try:
        embeddings = vectorize_text(chunks)

        with get_db_session() as session:
            vectors = []
            for chunk, embedding in zip(chunks, embeddings):
                vector = Vector(file_id=file_id, content=chunk, embedding=embedding)
                vectors.append(vector)

            session.add_all(vectors)
            logger.info(f"Saved {len(vectors)} vectors for file {file_id}")
            return vectors

    except SQLAlchemyError as e:
        logger.error(f"Database error while saving vectors: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Failed to save vectors: {str(e)}")
        raise
