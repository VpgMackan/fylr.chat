from fastapi import APIRouter, HTTPException, status
from ..schemas import (
    EmbeddingRequest,
    EmbeddingResponse,
)

from ai_gateway.providers import providers
from ..config import settings

router = APIRouter()


@router.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
    provider_name = request.provider or settings.default_embedding_provider
    model_name = request.model or settings.default_embedding_model

    try:
        response = providers[provider_name].generate_embeddings(
            input_text=request.input, model=model_name, options=request.options
        )
        return response.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred with the '{provider_name}' provider: {e}",
        )
