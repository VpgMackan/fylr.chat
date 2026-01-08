from abc import ABC
from typing import List, Dict, Any, AsyncGenerator, Optional
import logging
from ..schemas import ChatCompletionRequest

log = logging.getLogger(__name__)


class GeneralProvider(ABC):
    def generate_text_to_speech(
        self, text: str, model: str, voice: str, options: Dict[str, Any]
    ):
        log.warning(
            "provider_unsupported_method", extra={"method": "generate_text_to_speech"}
        )
        raise NotImplementedError("Text-to-speech is not supported by this provider")

    def generate_text(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ):
        log.warning("provider_unsupported_method", extra={"method": "generate_text"})
        raise NotImplementedError("Text generation is not supported by this provider")

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        log.warning(
            "provider_unsupported_method", extra={"method": "generate_text_stream"}
        )
        if False:
            yield
        raise NotImplementedError("Streaming text is not supported by this provider")

    def rerank(
        self,
        query: str,
        documents: List[str],
        model: str,
        top_n: Optional[int] = None,
    ):
        log.warning("provider_unsupported_method", extra={"method": "rerank"})
        raise NotImplementedError("Reranking is not supported by this provider")


class EmbeddingProvider(ABC):
    def generate_embeddings(self, input_text, model, options):
        log.warning(
            "provider_unsupported_method", extra={"method": "generate_embeddings"}
        )
        raise NotImplementedError("Embeddings are not supported by this provider")

    def rerank(
        self,
        query: str,
        documents: List[str],
        model: str,
        top_n: Optional[int] = None,
    ):
        log.warning("provider_unsupported_method", extra={"method": "rerank"})
        raise NotImplementedError("Reranking is not supported by this provider")
