from abc import ABC
from typing import List, Dict, Any, AsyncGenerator


class BaseProvider(ABC):
    def generate_embeddings(self, chunk, model, options):
        print(
            "WARNING: this provider doesn't provide support for generating embeddigns"
        )

    def generate_text(
        self, messages: List[Dict[str, Any]], model: str, options: Dict[str, Any]
    ):
        print(
            "WARNING: this provider doesn't provide support for non-streaming text generation"
        )

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], model: str, options: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        print(
            "WARNING: this provider doesn't provide support for streaming text generation"
        )
        if False:
            yield
