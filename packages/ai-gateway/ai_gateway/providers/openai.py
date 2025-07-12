from openai import OpenAI
from typing import List, Dict, Any, AsyncGenerator

from .base import BaseProvider
from ..config import settings
from ..schemas import ChatCompletionResponse


class OpenaiProvider(BaseProvider):
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.openai_api_key, base_url="https://litellm.katt.gdn"
        )

    def generate_text(
        self, messages: List[Dict[str, Any]], model: str, options: Dict[str, Any]
    ):
        """
        Generates a non-streaming chat completion.
        """
        response = self.client.chat.completions.create(
            model=model, messages=messages, stream=False, **options
        )
        return response.model_dump()

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], model: str, options: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        """
        Generates a streaming chat completion.
        """
        stream = self.client.chat.completions.create(
            model=model, messages=messages, stream=True, **options
        )
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
