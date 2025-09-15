from abc import ABC
from typing import List, Dict, Any, AsyncGenerator
import structlog

log = structlog.get_logger()


class BaseProvider(ABC):
    def generate_embeddings(self, chunk, model, options):
        log.warn("provider_unsupported_method", method="generate_embeddings")

    def generate_text_to_speech(
        self, text: str, model: str, voice: str, options: Dict[str, Any]
    ):
        log.warn("provider_unsupported_method", method="generate_text_to_speech")

    def generate_text(
        self, messages: List[Dict[str, Any]], model: str, options: Dict[str, Any]
    ):
        log.warn("provider_unsupported_method", method="generate_text")

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], model: str, options: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        log.warn("provider_unsupported_method", method="generate_text_stream")
        if False:
            yield
