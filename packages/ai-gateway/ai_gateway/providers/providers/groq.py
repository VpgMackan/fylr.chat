import httpx
from groq import Groq, AsyncGroq
from typing import List, Dict, Any, AsyncGenerator
import structlog

from ..base import BaseProvider
from ...schemas import ChatCompletionRequest
from ...config import settings

log = structlog.get_logger()


class GroqProvider(BaseProvider):
    def __init__(self):
        if not settings.groq_api_key:
            log.warn("groq_api_key_not_set")
            self.client = None
            self.async_client = None
        else:
            sync_transport = httpx.HTTPTransport(retries=3)
            sync_http_client = httpx.Client(transport=sync_transport)

            async_transport = httpx.AsyncHTTPTransport(retries=3)
            async_http_client = httpx.AsyncClient(transport=async_transport)

            self.client = Groq(
                api_key=settings.groq_api_key, http_client=sync_http_client
            )
            self.async_client = AsyncGroq(
                api_key=settings.groq_api_key, http_client=async_http_client
            )

    def generate_text(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ):
        """
        Generates a non-streaming chat completion using Groq.
        """
        if not self.client:
            raise ValueError("Groq API key is not configured")

        if not request.model:
            raise ValueError("A model must be specified for the GroqProvider.")

        try:
            response = self.client.chat.completions.create(
                model=request.model, messages=messages, stream=False, **request.options
            )
            return response.model_dump()

        except Exception as e:
            log.error("groq_text_generation_error", error=str(e))
            raise Exception(f"Groq text generation error: {e}") from e

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """
        Generates a streaming chat completion using Groq.
        """
        if not self.async_client:
            raise ValueError("Groq API key is not configured")

        if not request.model:
            raise ValueError("A model must be specified for the GroqProvider.")

        try:
            stream = await self.async_client.chat.completions.create(
                model=request.model, messages=messages, stream=True, **request.options
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content

        except Exception as e:
            log.error("groq_stream_generation_error", error=str(e))
            raise Exception(f"Groq stream generation error: {e}") from e

    def generate_text_to_speech(self, text, model, voice, options):
        """
        Generates text-to-speech audio using Groq.
        """
        if not self.client:
            raise ValueError("Groq API key is not configured")

        try:
            response_format = options.get("response_format", "wav")

            cleaned_options = {
                k: v for k, v in options.items() if k != "response_format"
            }

            response = self.client.audio.speech.create(
                model=model,
                voice=voice,
                input=text,
                response_format=response_format,
                **cleaned_options,
            )

            audio_bytes = b""
            for chunk in response.iter_bytes():
                audio_bytes += chunk

            return audio_bytes

        except Exception as e:
            log.error("groq_tts_error", error=str(e))
            raise Exception(f"Groq TTS error: {e}") from e
