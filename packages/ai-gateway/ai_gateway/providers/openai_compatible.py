import httpx
from openai import OpenAI, AsyncOpenAI
from typing import List, Dict, Any, AsyncGenerator

from .base import BaseProvider


class OpenaiCompatibleProvider(BaseProvider):
    def __init__(self, api_key, base_url):
        sync_transport = httpx.HTTPTransport(retries=3)
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.Client(transport=sync_transport),
        )

        async_transport = httpx.AsyncHTTPTransport(retries=3)
        self.async_client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.AsyncClient(transport=async_transport),
        )

    def generate_text_to_speech(self, text, model, voice, options):
        """
        Generates text-to-speech audio.
        """
        response = self.client.audio.speech.create(
            model=model, input=text, voice=voice, **options
        )
        return response.content

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
        stream = await self.async_client.chat.completions.create(
            model=model, messages=messages, stream=True, **options
        )
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
