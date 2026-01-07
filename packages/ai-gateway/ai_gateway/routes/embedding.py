import logging
from opentelemetry import trace
from fastapi import APIRouter, HTTPException, status
from ..schemas import (
    EmbeddingRequest,
    EmbeddingResponse,
)

from ai_gateway.providers import providers
from ..config import settings
from ..models_registry import models_registry

router = APIRouter()
log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


@router.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
    provider_name = request.provider or settings.default_embedding_provider
    model_name = request.model or settings.default_embedding_model

    with tracer.start_as_current_span("create_embedding") as span:
        span.set_attribute("provider", provider_name)
        span.set_attribute("model", model_name)
        input_count = len(request.input) if isinstance(request.input, list) else 1
        span.set_attribute("input_count", input_count)

        log.info(
            "Embedding request",
            extra={
                "provider": provider_name,
                "model": model_name,
                "input_count": input_count,
            },
        )

        try:
            response = providers[provider_name].generate_embeddings(
                input_text=request.input, model=model_name, options=request.options
            )
            log.info(
                "Embedding success",
                extra={"provider": provider_name, "model": model_name},
            )
            return response.model_dump()
        except Exception as e:
            log.error(
                "Embedding error", extra={"error": str(e), "provider": provider_name}
            )
            span.set_attribute("error", True)
            span.record_exception(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred with the '{provider_name}' provider: {e}",
            )


@router.get("/v1/embeddings/models")
async def get_available_models():
    """Get all available embedding models and the default model."""
    with tracer.start_as_current_span("get_available_models"):
        try:
            models_data = models_registry.get_all_models()
            log.info(
                "Available models request",
                extra={"model_count": len(models_data["models"])},
            )
            return models_data
        except Exception as e:
            log.error("Error fetching available models", extra={"error": str(e)})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving available models: {e}",
            )
