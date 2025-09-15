from fastapi import APIRouter, HTTPException, status
from ..schemas import (
    EmbeddingRequest,
    EmbeddingResponse,
)

from ai_gateway.providers import providers

router = APIRouter()


@router.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
    try:
        response = providers[request.provider].generate_embeddings(
            input_text=request.input, model=request.model, options=request.options
        )
        return response.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred with the '{request.provider}' provider: {e}",
        )
