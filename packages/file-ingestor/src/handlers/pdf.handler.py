import logging

supported_types = ["application/pdf"]
logger = logging.getLogger(__name__)


def handle(buffer: bytes) -> str:
    print("Handling PDF file")
