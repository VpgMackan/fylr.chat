import importlib
from functools import lru_cache
from fastapi import FastAPI, HTTPException, status

from .schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from .providers.base import BaseProvider

app = FastAPI(
    title="AI Gateway",
    description="A unified API for multiple AI providers.",
    version="1.0.0",
)


@lru_cache(maxsize=10)
def get_provider(provider_name: str) -> BaseProvider:
    """
    Dynamically imports and instantiates a provider class.
    Example: provider_name="litellm" -> imports `LiteLLMProvider` from `ai_gateway.providers.litellm`
    """
    try:
        module_path = f"ai_gateway.providers.{provider_name}"
        provider_module = importlib.import_module(module_path)

        class_name = (
            f"{provider_name.replace('_', ' ').title().replace(' ', '')}Provider"
        )

        provider_class = getattr(provider_module, class_name)
        return provider_class()
    except (ImportError, AttributeError) as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_name}' not found or could not be loaded. Error: {e}",
        )


# --- API Endpoints ---


@app.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def create_chat_completion(request: ChatCompletionRequest):
    """
    Generates a chat completion through the specified provider.
    """
    try:
        provider = get_provider(request.provider)

        messages_dict = [msg.model_dump() for msg in request.messages]

        response = provider.generate_text(
            messages=messages_dict, model=request.model, options=request.options
        )
        return response.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred with the '{request.provider}' provider: {e}",
        )


@app.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
    """
    Generates embeddings for the input text using the specified provider.
    """
    try:
        provider = get_provider(request.provider)
        response = provider.generate_embeddings(
            input_text=request.input, model=request.model, options=request.options
        )
        return response.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred with the '{request.provider}' provider: {e}",
        )


@app.get("/")
def read_root():
    return {"status": "AI Gateway is running"}
