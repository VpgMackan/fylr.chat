import logging
import httpx
from typing import List, Optional
from opentelemetry import trace
from ..base import EmbeddingProvider
from ...config import settings
from ...schemas import EmbeddingResponse

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class JinaEmbeddingProvider(EmbeddingProvider):
    def generate_embeddings(self, input_text, model, options: object = {}):
        with tracer.start_as_current_span("jina_generate_embeddings") as span:
            span.set_attribute("model", model)

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.jina_api_key}",
            }

            if isinstance(input_text, str):
                input_data = [input_text]
            else:
                input_data = input_text

            span.set_attribute("input_count", len(input_data))

            data = {
                "model": model,
                "input": input_data,
                **options,
            }

            try:
                with httpx.Client() as httpx_client:
                    response = httpx_client.post(
                        f"{settings.jina_api_url}/embeddings",
                        json=data,
                        headers=headers,
                    )
                    response.raise_for_status()
                    response_data = response.json()

                    log.debug(
                        "Jina embeddings success",
                        extra={"model": model, "input_count": len(input_data)},
                    )
                    return EmbeddingResponse(
                        provider="jina",
                        model=response_data.get("model"),
                        data=response_data.get("data"),
                        usage=response_data.get("usage"),
                    )
            except httpx.HTTPStatusError as e:
                log.error(
                    "Jina API error", extra={"status_code": e.response.status_code}
                )
                span.set_attribute("error", True)
                span.record_exception(e)
                raise Exception(
                    f"Jina API Error: {e.response.status_code} - {e.response.text}"
                ) from e
            except Exception as e:
                log.error("Jina provider error", extra={"error": str(e)})
                span.set_attribute("error", True)
                span.record_exception(e)
                raise Exception(
                    f"An unexpected error occurred with Jina provider: {e}"
                ) from e

    def rerank(
        self,
        query: str,
        documents: List[str],
        model: str = "jina-reranker-v2-base-multilingual",
        top_n: Optional[int] = None,
    ):
        """
        Rerank documents based on their relevance to a query using Jina's reranking API.
        Uses cross-encoder models for more accurate semantic relevance scoring.
        """
        with tracer.start_as_current_span("jina_rerank") as span:
            span.set_attribute("model", model)
            span.set_attribute("document_count", len(documents))
            if top_n:
                span.set_attribute("top_n", top_n)

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.jina_api_key}",
            }

            data = {
                "model": model,
                "query": query,
                "documents": documents,
            }

            if top_n is not None:
                data["top_n"] = top_n

            try:
                with httpx.Client() as httpx_client:
                    response = httpx_client.post(
                        f"{settings.jina_api_url}/rerank",
                        json=data,
                        headers=headers,
                        timeout=30.0,  # Reranking can take longer than embeddings
                    )
                    response.raise_for_status()
                    log.debug(
                        "Jina rerank success",
                        extra={"model": model, "document_count": len(documents)},
                    )
                    return response.json()
            except httpx.HTTPStatusError as e:
                log.error(
                    "Jina Rerank API error",
                    extra={"status_code": e.response.status_code},
                )
                span.set_attribute("error", True)
                span.record_exception(e)
                raise Exception(
                    f"Jina Rerank API Error: {e.response.status_code} - {e.response.text}"
                ) from e
            except Exception as e:
                log.error("Jina rerank error", extra={"error": str(e)})
                span.set_attribute("error", True)
                span.record_exception(e)
                raise Exception(
                    f"An unexpected error occurred during reranking: {e}"
                ) from e
