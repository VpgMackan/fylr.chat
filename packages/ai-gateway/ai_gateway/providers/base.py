from abc import ABC
from typing import List, Dict, Any, AsyncGenerator, Optional
import structlog
from ..schemas import ChatCompletionRequest

log = structlog.get_logger()


class BaseProvider(ABC):
    def generate_embeddings(self, chunk, model, options):
        log.warn("provider_unsupported_method", method="generate_embeddings")

    def generate_text_to_speech(
        self, text: str, model: str, voice: str, options: Dict[str, Any]
    ):
        log.warn("provider_unsupported_method", method="generate_text_to_speech")

    def generate_text(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ):
        log.warn("provider_unsupported_method", method="generate_text")

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        log.warn("provider_unsupported_method", method="generate_text_stream")
        if False:
            yield

    def rerank(
        self,
        query: str,
        documents: List[str],
        model: str,
        top_n: Optional[int] = None,
    ):
        log.warn("provider_unsupported_method", method="rerank")
        raise NotImplementedError("Reranking is not supported by this provider")
