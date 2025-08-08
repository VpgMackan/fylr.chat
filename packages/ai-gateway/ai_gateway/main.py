import json
import time
import uuid
from functools import lru_cache
from typing import AsyncGenerator

import uvicorn

from openai import APIStatusError

from fastapi import FastAPI, HTTPException, status, Depends, HTTPException
from fastapi.responses import StreamingResponse

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
from .providers.base import BaseProvider
import importlib

app = FastAPI(
    title="AI Gateway",
    description="A unified API for multiple AI providers.",
    version="1.0.0",
)

PROMPTS_DIR = "/path/to/ai_gateway/prompts/config"
app.state.prompt_registry = None


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
    provider: BaseProvider, request: ChatCompletionRequest
) -> AsyncGenerator[str, None]:
    """
    Calls the provider's streaming method and formats the output as SSE.
    """
    completion_id = f"chatcmpl-{uuid.uuid4()}"
    created_time = int(time.time())

    messages_dict = [msg.model_dump() for msg in request.messages]

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
    provider = get_provider(request.provider)

    if request.stream:
        return StreamingResponse(
            stream_provider_response(provider, request), media_type="text/event-stream"
        )
    else:
        try:
            messages_dict = [msg.model_dump() for msg in request.messages]
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


@app.get("/")
def read_root():
    return {"status": "AI Gateway is running"}


def start():
    uvicorn.run("ai_gateway.main:app", host="0.0.0.0", port=8000, reload=True)
