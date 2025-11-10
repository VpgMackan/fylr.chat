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
from pgvector.sqlalchemy import Vector as PgVector

Base = declarative_base()


class DocumentVector(Base):
    __tablename__ = "Vectors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, ForeignKey("Sources.id"), nullable=False)
    embedding = Column(PgVector(1024))
    content = Column(Text)
    chunk_index = Column(Integer)

    source = relationship("Source", back_populates="vectors")


class Source(Base):
    __tablename__ = "Sources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    library_id = Column(String, ForeignKey("Libraries.id"), nullable=False)
    name = Column(String, nullable=False)
    mime_type = Column(String, nullable=False, name="type")
    url = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    upload_time = Column(DateTime, default=func.now())
    job_key = Column(String, nullable=False)
    status = Column(Text, nullable=False)
    ingestor_type = Column(String, nullable=True, name="ingestorType")
    ingestor_version = Column(String, nullable=True, name="ingestorVersion")

    vectors = relationship("DocumentVector", back_populates="source")
    library = relationship("Library", back_populates="sources")


class Library(Base):
    __tablename__ = "Libraries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    tags = Column(ARRAY(String))
    title = Column(String, nullable=False)

    sources = relationship("Source", back_populates="library")


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
