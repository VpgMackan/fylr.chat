import os
import uuid
from contextlib import contextmanager
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    ForeignKey,
    DateTime,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class GiftCard(Base):
    __tablename__ = "GiftCard"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, nullable=False, unique=True)
    days = Column(Integer, nullable=False)
    status = Column(String, nullable=False)

    redeemed_by_user_id = Column(String)

    expires_at = Column(DateTime, nullable=False, default=lambda: func.now())
    redeemed_at = Column(DateTime)


def get_database_url():
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")

    # Validate required environment variables
    if not all([db_user, db_pass, db_host, db_port, db_name]):
        missing = []
        if not db_user:
            missing.append("DB_USER")
        if not db_pass:
            missing.append("DB_PASS")
        if not db_host:
            missing.append("DB_HOST")
        if not db_port:
            missing.append("DB_PORT")
        if not db_name:
            missing.append("DB_NAME")
        raise ValueError(
            f"Missing required database environment variables: {', '.join(missing)}. "
            f"Please ensure all database configuration is set in your .env file."
        )

    return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"


engine = create_engine(get_database_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db_session():
    """Provides a transactional scope around a series of operations."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
