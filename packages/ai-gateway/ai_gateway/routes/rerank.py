from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import structlog

from ..providers import get_provider
from ..config import settings

log = structlog.get_logger()

router = APIRouter()


class RerankDocument(BaseModel):
    text: str
    metadata: Optional[dict] = None


class RerankRequest(BaseModel):
    query: str = Field(..., description="The query to compare documents against")
    documents: List[RerankDocument] = Field(
        ..., description="List of documents to rerank"
    )
    model: Optional[str] = Field(
        default="jina-reranker-v2-base-multilingual",
        description="The reranking model to use",
    )
    top_n: Optional[int] = Field(
        default=None, description="Return only the top N results"
    )


class RerankResult(BaseModel):
    index: int = Field(..., description="Original index of the document")
    relevance_score: float = Field(..., description="Relevance score (0-1)")
    document: RerankDocument


class RerankResponse(BaseModel):
    model: str
    results: List[RerankResult]


@router.post("/v1/rerank", response_model=RerankResponse)
async def rerank(request: RerankRequest):
    """
    Rerank documents based on their semantic relevance to a query.
    Uses Jina's reranking API which employs cross-encoder models for
    more accurate relevance scoring compared to vector similarity alone.
    """
    try:
        log.info(
            "rerank_request",
            query=request.query,
            num_documents=len(request.documents),
            model=request.model,
        )

        if not request.documents:
            return RerankResponse(model=request.model, results=[])

        # Get the Jina provider for reranking
        provider = get_provider("jina")

        # Use the provider's rerank method
        rerank_response = provider.rerank(
            query=request.query,
            documents=[doc.text for doc in request.documents],
            model=request.model,
            top_n=request.top_n,
        )

        # Build response with original document metadata
        results = []
        for result in rerank_response["results"]:
            original_index = result["index"]
            results.append(
                RerankResult(
                    index=original_index,
                    relevance_score=result["relevance_score"],
                    document=request.documents[original_index],
                )
            )

        log.info(
            "rerank_success",
            num_results=len(results),
            top_score=results[0].relevance_score if results else None,
        )

        return RerankResponse(
            model=rerank_response.get("model", request.model), results=results
        )

    except Exception as e:
        log.error("rerank_error", error=str(e), error_type=type(e).__name__)
        raise HTTPException(
            status_code=500, detail=f"Failed to rerank documents: {str(e)}"
        )
