from pgvector.sqlalchemy import Vector as PgVector
from sqlalchemy import Column, String, Text, ForeignKey, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class Vector(Base):
    __tablename__ = "Vectors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), ForeignKey("Sources.id"), nullable=False)
    embedding = Column(PgVector(1024))
    content = Column(Text)

    source = relationship("Sources", back_populates="vectors")


class Sources(Base):
    __tablename__ = "Sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pocket_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    url = Column(String, nullable=False)
    size = Column(BigInteger, nullable=False)
    upload_time = Column(DateTime, default=func.now())
    job_key = Column(UUID(as_uuid=True), nullable=False)
    status = Column(Text, nullable=False)

    vectors = relationship("Vector", back_populates="source")
