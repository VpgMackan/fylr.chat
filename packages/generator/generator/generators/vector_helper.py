import json, uuid
import structlog

from abc import ABC, abstractmethod
from sqlalchemy.orm import Session, joinedload
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

log = structlog.getLogger(__name__)


class VectorHelper(ABC):
    def _cluster_vectors_auto_safe():
        pass
