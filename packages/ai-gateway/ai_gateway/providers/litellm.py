from .base import BaseProvider
from ..config import settings

import json
import httpx


class LitellmProvider(BaseProvider):
    def __init__(self):
        self.api_url = "https://litellm.katt.gdn/v1/chat/completions"
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate_text(self, prompt, model, options):
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        data = {
            "model": "groq/llama3-70b-8192",
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
        }
        try:
            async with self.httpx_client.stream(
                "POST",
                self.api_url,
                json=data,
                headers=headers,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        message = line[6:]
                        if message == "[DONE]":
                            return

                        parsed = json.loads(message)
                        content = (
                            parsed.get("choices", [{}])[0]
                            .get("delta", {})
                            .get("content")
                        )
                        if content:
                            yield content
        except Exception as e:
            raise e
