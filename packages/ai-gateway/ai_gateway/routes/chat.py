import json
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator, Optional

from openai import APIStatusError

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse

from ..prompts.registry import (
    PromptRegistry,
    PromptRenderError,
    PromptNotFound,
    PromptValidationError,
)

from ..schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
)
from ..providers.base import BaseProvider
from ai_gateway.providers import providers

PROMPTS_DIR = Path(__file__).parent.parent / "prompts" / "config"
router = APIRouter()
prompt_registry = PromptRegistry(PROMPTS_DIR)


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


@router.post("/v1/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    """
    Generates a chat completion through the specified provider.
    Supports both streaming and non-streaming responses.
    """
    messages_dict = []

    if request.prompt_type:
        try:
            rendered = prompt_registry.render(
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

    if request.stream:
        return StreamingResponse(
            stream_provider_response(
                providers[request.provider], request, messages_dict
            ),
            media_type="text/event-stream",
        )
    else:
        try:
            response_data = providers[request.provider].generate_text(
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


@router.get("/v1/prompts")
async def list_prompts():
    """Lists all available prompt templates."""
    return {"prompts": prompt_registry.list_prompts()}


@router.get("/v1/prompts/{prompt_id}")
async def inspect_prompt(
    prompt_id: str,
    version: Optional[str] = None,
):
    """
    Inspects a specific prompt template, showing its metadata and variables.
    """
    try:
        return prompt_registry.inspect(prompt_id, version)
    except PromptNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
