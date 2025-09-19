import httpx
import structlog
from typing import Dict, Any, List, Union

from ..config import settings

log = structlog.getLogger(__name__)


class AIGatewayService:
    def __init__(self):
        self.base_url = settings.ai_gateway_url
        self.client = httpx.Client(base_url=self.base_url, timeout=120.0)
        log.info(
            f"AI Gateway Service initialized for URL: {self.base_url}",
            method="__init__",
        )

    def generate_embeddings(
        self, text: str, model: str = "jina-clip-v2"
    ) -> List[float]:
        """
        Generates embeddings for search queries using the AI Gateway.
        """
        request_payload = {
            "provider": "jina",
            "model": model,
            "input": [text],
            "options": {"task": "retrieval.query"},
        }

        try:
            response = self.client.post("/v1/embeddings", json=request_payload)
            response.raise_for_status()

            data = response.json()

            if "data" not in data or not isinstance(data["data"], list):
                log.error(
                    f"Unexpected response structure: {data}",
                    method="generate_embeddings",
                )
                raise ValueError("Invalid response structure from AI Gateway")

            if not data["data"] or "embedding" not in data["data"][0]:
                raise ValueError("Missing embedding in response data")

            return data["data"][0]["embedding"]

        except httpx.HTTPStatusError as e:
            log.error(
                f"HTTP error calling AI Gateway for embeddings: {e.response.status_code} - {e.response.text}",
                method="generate_embeddings",
            )
            raise
        except Exception as e:
            log.error(
                f"An unexpected error occurred while generating embeddings: {e}",
                method="generate_embeddings",
            )
            raise

    def generate_text(
        self,
        prompt_or_options: Union[str, Dict[str, Any]],
        model: str = "groq/llama3-70b-8192",
    ) -> str:
        """
        Generates text using the AI Gateway's chat completion endpoint.
        Accepts a raw prompt string or a dictionary for template-based generation.
        """
        if isinstance(prompt_or_options, str):
            payload = {"messages": [{"role": "user", "content": prompt_or_options}]}
        else:
            payload = prompt_or_options

        request_payload = {
            "provider": "auto",
            "stream": False,
            **payload,
        }

        try:
            response = self.client.post("/v1/chat/completions", json=request_payload)
            response.raise_for_status()

            data = response.json()

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not content:
                log.warning(
                    "AI Gateway returned an empty response.", method="generate_text"
                )
                return ""

            return content

        except httpx.HTTPStatusError as e:
            log.error(
                f"HTTP error calling AI Gateway: {e.response.status_code} - {e.response.text}",
                method="generate_text",
            )
            raise
        except Exception as e:
            log.error(
                f"An unexpected error occurred while calling AI Gateway: {e}",
                method="generate_text",
            )
            raise

    def generate_tts(
        self,
        text: str,
        model: str = "tts-1",
        voice: str = "alloy",
        provider: str = "openai",
    ) -> bytes:
        """
        Generates text-to-speech audio using the AI Gateway.
        """
        request_payload = {
            "provider": provider,
            "text": text,
            "model": model,
            "voice": voice,
            "options": {},
        }

        try:
            response = self.client.post("/v1/tts", json=request_payload)
            response.raise_for_status()

            return response.content

        except httpx.HTTPStatusError as e:
            log.error(
                f"HTTP error calling AI Gateway for TTS: {e.response.status_code} - {e.response.text}",
                method="generate_tts",
            )
            raise
        except Exception as e:
            log.error(
                f"An unexpected error occurred while generating TTS: {e}",
                method="generate_tts",
            )
            raise


ai_gateway_service = AIGatewayService()
