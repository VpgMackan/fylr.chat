from pgvector.sqlalchemy import Vector as PgVector
from sqlalchemy import Column, String, Text, ForeignKey, BigInteger, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

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
    type = Column(String, nullable=False)
    url = Column(String, nullable=False)
    size = Column(BigInteger, nullable=False)
    upload_time = Column(DateTime, default=func.now())
    job_key = Column(String, nullable=False)
    status = Column(Text, nullable=False)

    vectors = relationship("DocumentVector", back_populates="source")
    library = relationship("Library", back_populates="sources")


class SummaryEpisode(Base):
    __tablename__ = "SummaryEpisode"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    summary_id = Column(String, ForeignKey("Summary.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    title = Column(String, nullable=False)
    focus = Column(Text, nullable=True)

    summary = relationship("Summary", back_populates="episodes")


class Summary(Base):
    __tablename__ = "Summary"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    library_id = Column(String, ForeignKey("Libraries.id"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    length = Column(BigInteger, nullable=False)
    generated = Column(Text, nullable=True)

    library = relationship("Library", back_populates="summaries")
    episodes = relationship("SummaryEpisode", back_populates="summary")


class PodcastEpisode(Base):
    __tablename__ = "PodcastEpisode"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    podcast_id = Column(String, ForeignKey("Podcast.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    title = Column(String, nullable=False)
    focus = Column(Text, nullable=True)
    audio_key = Column(String, nullable=True)

    podcast = relationship("Podcast", back_populates="episodes")


class Podcast(Base):
    __tablename__ = "Podcast"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    library_id = Column(String, ForeignKey("Libaries.id"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    length = Column(BigInteger, nullable=False)
    generated = Column(Text, nullable=True)

    library = relationship("Library", back_populates="podcast")
    episodes = relationship("PodcastEpisode", back_populates="podcast")


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
    summaries = relationship("Summary", back_populates="library")
    podcast = relationship("Podcast", back_populates="library")
