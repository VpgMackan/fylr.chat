import json
import time
import uuid
from pathlib import Path
from functools import lru_cache
from typing import AsyncGenerator, Optional

import uvicorn

from openai import APIStatusError

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.responses import StreamingResponse

import logging
from .logging_config import configure_logging
import structlog
from asgi_correlation_id import CorrelationIdMiddleware

from .prompts.registry import (
    PromptRegistry,
    PromptRenderError,
    PromptNotFound,
    PromptValidationError,
)

from .schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from .config import settings
from .providers.base import BaseProvider
import importlib

app = FastAPI(
    title="AI Gateway",
    description="A unified API for multiple AI providers.",
    version="1.0.0",
)

PROMPTS_DIR = Path(__file__).parent / "prompts" / "config"
app.state.prompt_registry = None
app.add_middleware(CorrelationIdMiddleware)


configure_logging(log_level="INFO", json_logs=False)
log = structlog.get_logger()


@app.on_event("startup")
async def startup_event():
    app.state.prompt_registry = PromptRegistry(PROMPTS_DIR)


def get_registry() -> PromptRegistry:
    reg = app.state.prompt_registry
    if not reg:
        raise RuntimeError("Prompt registry not initialized")
    return reg


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


async def stream_provider_response(
    provider: BaseProvider, request: ChatCompletionRequest, messages_dict: list
) -> AsyncGenerator[str, None]:
    """
    Calls the provider's streaming method and formats the output as SSE.
    """
    completion_id = f"chatcmpl-{uuid.uuid4()}"
    created_time = int(time.time())

    try:
        async for chunk_content in provider.generate_text_stream(
            messages=messages_dict, model=request.model, options=request.options
        ):
            chunk_data = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": request.model,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": chunk_content},
                        "finish_reason": None,
                    }
                ],
            }
            # Format as Server-Sent Event (SSE)
            yield f"data: {json.dumps(chunk_data)}\n\n"

        # Send the final DONE message
        yield "data: [DONE]\n\n"

    except Exception as e:
        error_data = {
            "error": f"An error occurred with the '{request.provider}' provider: {e}"
        }
        yield f"data: {json.dumps(error_data)}\n\n"
        yield "data: [DONE]\n\n"


# --- API Endpoints ---


@app.post("/v1/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    """
    Generates a chat completion through the specified provider.
    Supports both streaming and non-streaming responses.
    """
    messages_dict = []

    if request.prompt_type:
        registry = get_registry()
        try:
            rendered = registry.render(
                prompt_id=request.prompt_type,
                version=request.prompt_version,
                vars=request.prompt_vars,
            )
            if rendered.get("form") == "messages":
                messages_dict = rendered["messages"]
            else:
                messages_dict = [{"role": "user", "content": rendered["prompt"]}]
        except (PromptNotFound, PromptRenderError, PromptValidationError) as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    elif request.messages:
        messages_dict = [msg.model_dump() for msg in request.messages]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'messages' or 'prompt_type' must be provided.",
        )

    provider = get_provider(request.provider)

    if request.stream:
        return StreamingResponse(
            stream_provider_response(provider, request, messages_dict),
            media_type="text/event-stream",
        )
    else:
        try:
            response_data = provider.generate_text(
                messages=messages_dict, model=request.model, options=request.options
            )

            if "usage" in response_data:
                usage = response_data["usage"]
                response_data["usage"] = {
                    "completion_tokens_details": int(
                        usage.get("completion_tokens_details") or 0
                    ),
                    "prompt_tokens_details": int(
                        usage.get("prompt_tokens_details") or 0
                    ),
                    "queue_time": int(float(usage.get("queue_time") or 0)),
                    "prompt_time": int(float(usage.get("prompt_time") or 0)),
                    "completion_time": int(float(usage.get("completion_time") or 0)),
                    "total_time": int(float(usage.get("total_time") or 0)),
                }

            return ChatCompletionResponse(**response_data)

        except APIStatusError as e:
            raise HTTPException(status_code=e.status_code, detail=e.response.text)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred with the '{request.provider}' provider: {e}",
            )


@app.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embedding(request: EmbeddingRequest):
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


@app.get("/v1/prompts")
async def list_prompts(registry: PromptRegistry = Depends(get_registry)):
    """Lists all available prompt templates."""
    return {"prompts": registry.list_prompts()}


@app.get("/v1/prompts/{prompt_id}")
async def inspect_prompt(
    prompt_id: str,
    version: Optional[str] = None,
    registry: PromptRegistry = Depends(get_registry),
):
    """
    Inspects a specific prompt template, showing its metadata and variables.
    """
    try:
        return registry.inspect(prompt_id, version)
    except PromptNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@app.get("/")
def read_root():
    return {"status": "AI Gateway is running"}


def start():
    uvicorn.run(
        "ai_gateway.main:app",
        host="0.0.0.0",
        port=settings.ai_gateway_port,
        reload=True,
    )
