import httpx
from posthog import Posthog
from posthog.ai.openai import OpenAI, AsyncOpenAI
from typing import List, Dict, Any, AsyncGenerator

from ..base import BaseProvider
from ...schemas import ChatCompletionRequest
from ...config import settings


class OpenaiCompatibleProvider(BaseProvider):
    def __init__(self, api_key, base_url):
        self.posthog = Posthog(
            settings.posthog_api_key,
            host=settings.posthog_api_url,
            privacy_mode=settings.environment == "production",
        )
        sync_transport = httpx.HTTPTransport(retries=3)
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.Client(transport=sync_transport),
            posthog_client=self.posthog,
        )

        async_transport = httpx.AsyncHTTPTransport(retries=3)
        self.async_client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.AsyncClient(transport=async_transport),
            posthog_client=self.posthog,
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
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ):
        """
        Generates a non-streaming chat completion.
        """
        if not request.model:
            raise ValueError(
                "A model must be psecified for the OpenaiCompatibleProvider."
            )

        # Prepare the request parameters
        params = {
            "model": request.model,
            "messages": messages,
            "stream": False,
            **request.options,
        }

        if request.user_id:
            params["posthog_distinct_id"] = request.user_id

        # Add tool-related parameters if provided
        if request.tools:
            params["tools"] = [tool.model_dump() for tool in request.tools]
        if request.tool_choice:
            params["tool_choice"] = request.tool_choice

        if request.reasoning is not None:
            if isinstance(request.reasoning, bool):
                if not request.reasoning:
                    params["reasoning"] = {"exclude": True}
            else:
                reasoning_dict = request.reasoning.model_dump(exclude_none=True)
                if reasoning_dict:
                    params["reasoning"] = reasoning_dict

        response = self.client.chat.completions.create(**params)
        return response.model_dump()

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generates a streaming chat completion.
        Yields dict with 'content' and optionally 'tool_calls'.
        """
        if not request.model:
            raise ValueError(
                "A model must be specified for the OpenaiCompatibleProvider."
            )

        # Prepare the request parameters
        params = {
            "model": request.model,
            "messages": messages,
            "stream": True,
            **request.options,
        }

        if request.user_id:
            params["posthog_distinct_id"] = request.user_id

        # Add tool-related parameters if provided
        if request.tools:
            params["tools"] = [tool.model_dump() for tool in request.tools]
        if request.tool_choice:
            params["tool_choice"] = request.tool_choice

        if request.reasoning is not None:
            if isinstance(request.reasoning, bool):
                if not request.reasoning:
                    params["reasoning"] = {"exclude": True}
            else:
                reasoning_dict = request.reasoning.model_dump(exclude_none=True)
                if reasoning_dict:
                    params["reasoning"] = reasoning_dict

        stream = await self.async_client.chat.completions.create(**params)
        async for chunk in stream:
            delta = chunk.choices[0].delta

            # Build response chunk
            chunk_data = {}

            if delta.content:
                # Sanitize content to remove invalid surrogates
                content = delta.content
                # Encode with surrogate replacement, then decode back
                try:
                    content = content.encode("utf-8", errors="replace").decode("utf-8")
                except (UnicodeEncodeError, UnicodeDecodeError):
                    # If encoding fails, use surrogatepass then replace
                    content = content.encode("utf-8", errors="ignore").decode("utf-8")
                chunk_data["content"] = content

            if delta.tool_calls:
                chunk_data["tool_calls"] = [tc.model_dump() for tc in delta.tool_calls]

            if delta.role:
                chunk_data["role"] = delta.role

            if chunk.choices[0].finish_reason:
                chunk_data["finish_reason"] = chunk.choices[0].finish_reason

            # Only yield if there's actual data
            if chunk_data:
                yield chunk_data
