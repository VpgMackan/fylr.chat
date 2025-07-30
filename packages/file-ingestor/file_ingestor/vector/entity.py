from pgvector.sqlalchemy import Vector as PgVector
from sqlalchemy import Column, String, Text, ForeignKey, BigInteger, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
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
    pocket_id = Column(String, ForeignKey("Pockets.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    url = Column(String, nullable=False)
    size = Column(BigInteger, nullable=False)
    upload_time = Column(DateTime, default=func.now())
    job_key = Column(String, nullable=False)
    status = Column(Text, nullable=False)

    vectors = relationship("DocumentVector", back_populates="source")
    pocket = relationship("Pocket", back_populates="sources")
