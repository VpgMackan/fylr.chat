from .base import BaseProvider
from ..config import settings

import httpx


class JinaProvider(BaseProvider):
    async def generate_embeddings(self, chunks, model, options: object = {}):
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.jina_api_key}",
        }
        data = {
            "model": model,
            "input": [{"text": chunk} for chunk in chunks],
            **options,
        }

        try:
            async with httpx.AsyncClient() as httpx_client:
                response = await httpx_client.post(
                    f"{settings.jina_api_url}/embeddings",
                    json=data,
                    headers=headers,
                )
                response_data = response.json()
                embeddings = []
                for item in response_data["data"]:
                    if "embedding" not in item:
                        raise ValueError("Missing embedding in response data")
                    embeddings.append(item["embedding"])
                return embeddings
        except Exception as e:
            raise
