import httpx
import logging
from typing import Dict, Any, List

from ..config import settings

logger = logging.getLogger(__name__)


class AIGatewayService:
    def __init__(self):
        self.base_url = settings.ai_gateway_url
        self.client = httpx.Client(base_url=self.base_url, timeout=120.0)
        logger.info(f"AI Gateway Service initialized for URL: {self.base_url}")

    def generate_text(self, prompt: str, model: str = "groq/llama3-70b-8192") -> str:
        """
        Generates text using the AI Gateway's chat completion endpoint.
        """
        request_payload = {
            "provider": "openai",
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }

        try:
            response = self.client.post("/v1/chat/completions", json=request_payload)
            response.raise_for_status()

            data = response.json()

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not content:
                logger.warning("AI Gateway returned an empty response.")
                return ""

            return content

        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error calling AI Gateway: {e.response.status_code} - {e.response.text}"
            )
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred while calling AI Gateway: {e}")
            raise


ai_gateway_service = AIGatewayService()
