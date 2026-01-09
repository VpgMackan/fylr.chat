import logging
from opentelemetry import trace
from fastapi import APIRouter, HTTPException, status
from ..schemas import (
    EmbeddingRequest,
    EmbeddingResponse,
    SetDefaultModelRequest,
    DeprecateModelRequest,
)

from ai_gateway.providers import get_embedding_provider
from ..models_registry import models_registry

router = APIRouter()
log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


def parse_full_model(full_model: str) -> tuple[str, str]:
    """
    Parse the embedding model format: timestamp@version@provider/model.
    Returns (provider, model) or raises ValueError if invalid.
    """
    parts = full_model.split("@")
    if len(parts) != 3:
        raise ValueError(
            "Invalid fullModel format. Expected timestamp@version@provider/model."
        )

    provider_model = parts[2]
    if "/" not in provider_model:
        raise ValueError(
            "Invalid fullModel format. provider/model section missing '/'."
        )

    provider, model = provider_model.split("/", 1)
    return provider, model


@router.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
    provider_name = request.provider
    model_name = request.model

    if request.fullModel:
        try:
            provider_name, model_name = parse_full_model(request.fullModel)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    if not provider_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider is required for embedding requests.",
        )

    if not model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model is required for embedding requests.",
        )

    with tracer.start_as_current_span("create_embedding") as span:
        span.set_attribute("provider", provider_name)
        span.set_attribute("model", model_name)
        if request.fullModel:
            span.set_attribute("full_model", request.fullModel)
        input_count = len(request.input) if isinstance(request.input, list) else 1
        span.set_attribute("input_count", input_count)

        log.info(
            "Embedding request",
            extra={
                "provider": provider_name,
                "model": model_name,
                "full_model": request.fullModel,
                "input_count": input_count,
            },
        )

        try:
            provider = get_embedding_provider(provider_name)
        except ValueError as e:
            span.set_attribute("error", True)
            span.record_exception(e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        try:
            response = provider.generate_embeddings(
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


@router.patch("/v1/embeddings/models/default")
async def set_default_model(request: SetDefaultModelRequest):
    """Admin endpoint to set the default embedding model."""
    with tracer.start_as_current_span("set_default_model"):
        try:
            success = models_registry.set_default_model(request.provider, request.model)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Model not found: {request.provider}/{request.model}",
                )

            models_data = models_registry.get_all_models()
            log.info(
                "Default model updated",
                extra={
                    "provider": request.provider,
                    "model": request.model,
                    "newDefault": models_data["default"],
                },
            )
            return models_data
        except HTTPException:
            raise
        except Exception as e:
            log.error(
                "Error setting default model",
                extra={"error": str(e), "provider": request.provider},
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating default model: {e}",
            )


@router.patch("/v1/embeddings/models/deprecate")
async def deprecate_model(request: DeprecateModelRequest):
    """Admin endpoint to deprecate a model with a deprecation date."""
    with tracer.start_as_current_span("deprecate_model"):
        try:
            success = models_registry.deprecate_model(
                request.provider, request.model, request.deprecationDate
            )
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Model not found: {request.provider}/{request.model}",
                )

            models_data = models_registry.get_all_models()
            log.info(
                "Model deprecated",
                extra={
                    "provider": request.provider,
                    "model": request.model,
                    "deprecationDate": request.deprecationDate,
                },
            )
            return models_data
        except HTTPException:
            raise
        except Exception as e:
            log.error(
                "Error deprecating model",
                extra={"error": str(e), "provider": request.provider},
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deprecating model: {e}",
            )
