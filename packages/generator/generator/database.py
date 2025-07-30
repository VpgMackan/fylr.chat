import os
import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from .config import settings

logger = logging.getLogger(__name__)


def get_database_url() -> str:
    """Constructs the database URL from settings."""
    if not all(
        [
            settings.db_user,
            settings.db_pass,
            settings.db_host,
            settings.db_port,
            settings.db_name,
        ]
    ):
        raise ValueError("One or more database environment variables are not set.")
    return f"postgresql://{settings.db_user}:{settings.db_pass}@{settings.db_host}:{settings.db_port}/{settings.db_name}"


try:
    DATABASE_URL = get_database_url()
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=os.getenv("DB_ECHO", "false").lower() == "true",
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Database connection pool established successfully.")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    raise


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Provides a transactional scope around a series of operations."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except SQLAlchemyError as e:
        logger.error(f"Database transaction failed. Rolling back. Error: {e}")
        session.rollback()
        raise
    except Exception as e:
        logger.error(
            f"An unexpected error occurred in the DB session. Rolling back. Error: {e}"
        )
        session.rollback()
        raise
    finally:
        session.close()
