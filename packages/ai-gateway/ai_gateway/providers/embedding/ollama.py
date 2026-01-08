import logging
import httpx
from typing import List, Optional
from opentelemetry import trace
from ..base import EmbeddingProvider
from ...config import settings
from ...schemas import EmbeddingResponse

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class OllamaEmbeddingProvider(EmbeddingProvider):
    def generate_embeddings(self, input_text, model, options: object = {}):
        with tracer.start_as_current_span("ollama_generate_embeddings") as span:
            span.set_attribute("model", model)

            headers = {
                "Content-Type": "application/json",
            }

            if isinstance(input_text, str):
                input_data = [input_text]
            else:
                input_data = input_text

            span.set_attribute("input_count", len(input_data))

            all_embeddings = []
            total_prompt_tokens = 0

            try:
                with httpx.Client(timeout=60.0) as httpx_client:
                    for idx, text in enumerate(input_data):
                        data = {
                            "model": "qwen3-embedding:4b",
                            "input": text,
                            "dimensions": 1024,
                        }

                        response = httpx_client.post(
                            "http://185.147.236.12:11434/api/embed",
                            json=data,
                            headers=headers,
                        )
                        response.raise_for_status()
                        response_data = response.json()

                        embeddings = response_data.get("embeddings", [])
                        if embeddings:
                            all_embeddings.append(
                                {
                                    "object": "embedding",
                                    "embedding": embeddings[0],
                                    "index": idx,
                                }
                            )

                        total_prompt_tokens += len(text.split())

                return EmbeddingResponse(
                    provider="ollama",
                    model=response_data.get("model", "qwen3-embedding:4b"),
                    data=all_embeddings,
                    usage={
                        "prompt_tokens": total_prompt_tokens,
                        "total_tokens": total_prompt_tokens,
                    },
                )

            except httpx.HTTPStatusError as e:
                span.set_attribute("error", True)
                span.record_exception(e)
                log.error(
                    "Ollama API error",
                    extra={
                        "status_code": e.response.status_code,
                        "response_text": e.response.text,
                    },
                )
                raise Exception(
                    f"Ollama API Error: {e.response.status_code} - {e.response.text}"
                ) from e
            except Exception as e:
                span.set_attribute("error", True)
                span.record_exception(e)
                log.error("Ollama provider error", extra={"error": str(e)})
                raise Exception(
                    f"An unexpected error occurred with Ollama provider: {e}"
                ) from e
