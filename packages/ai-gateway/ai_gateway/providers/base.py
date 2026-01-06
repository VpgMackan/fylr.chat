from abc import ABC
from typing import List, Dict, Any, AsyncGenerator, Optional
import logging
from ..schemas import ChatCompletionRequest

log = logging.getLogger(__name__)


class BaseProvider(ABC):
    def generate_embeddings(self, chunk, model, options):
        log.warning(
            "provider_unsupported_method", extra={"method": "generate_embeddings"}
        )

    def generate_text_to_speech(
        self, text: str, model: str, voice: str, options: Dict[str, Any]
    ):
        log.warning(
            "provider_unsupported_method", extra={"method": "generate_text_to_speech"}
        )

    def generate_text(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ):
        log.warning("provider_unsupported_method", extra={"method": "generate_text"})

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        log.warning(
            "provider_unsupported_method", extra={"method": "generate_text_stream"}
        )
        if False:
            yield

    def rerank(
        self,
        query: str,
        documents: List[str],
        model: str,
        top_n: Optional[int] = None,
    ):
        log.warning("provider_unsupported_method", extra={"method": "rerank"})
        raise NotImplementedError("Reranking is not supported by this provider")
