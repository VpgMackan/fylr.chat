import json
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator, Optional

from openai import APIStatusError

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse

from ..prompts.registry import (
    PromptRenderError,
    PromptNotFound,
    PromptValidationError,
)
from ..prompts import prompt_registry

from ..schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
)
from ..providers.base import BaseProvider
from ai_gateway.providers import providers

router = APIRouter()


async def stream_provider_response(
    provider: BaseProvider, request: ChatCompletionRequest, messages_dict: list
) -> AsyncGenerator[str, None]:
    """
    Calls the provider's streaming method and formats the output as SSE.
    Supports both text content and tool calls.
    """
    completion_id = f"chatcmpl-{uuid.uuid4()}"
    created_time = int(time.time())

    try:
        async for chunk_data_raw in provider.generate_text_stream(
            messages=messages_dict, request=request
        ):
            # Build the delta object from the chunk
            delta = {}
            finish_reason = chunk_data_raw.get("finish_reason")

            if "content" in chunk_data_raw:
                delta["content"] = chunk_data_raw["content"]

            if "tool_calls" in chunk_data_raw:
                delta["tool_calls"] = chunk_data_raw["tool_calls"]

            if "role" in chunk_data_raw:
                delta["role"] = chunk_data_raw["role"]

            chunk_data = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": request.model,
                "choices": [
                    {
                        "index": 0,
                        "delta": delta,
                        "finish_reason": finish_reason,
                    }
                ],
            }
            # Format as Server-Sent Event (SSE)
            # Use ensure_ascii=False to handle unicode properly, but errors='surrogatepass'
            # doesn't work with json.dumps, so we need to handle it differently
            try:
                json_str = json.dumps(chunk_data, ensure_ascii=False)
                # Encode to bytes and decode back, replacing surrogates
                json_str = json_str.encode("utf-8", errors="replace").decode("utf-8")
                yield f"data: {json_str}\n\n"
            except (UnicodeEncodeError, UnicodeDecodeError) as e:
                # If we still can't encode, fall back to ASCII-safe encoding
                json_str = json.dumps(chunk_data, ensure_ascii=True)
                yield f"data: {json_str}\n\n"

        # Send the final DONE message
        yield "data: [DONE]\n\n"

    except Exception as e:
        error_msg = (
            f"An error occurred with the '{request.provider}' provider: {str(e)}"
        )
        error_data = {"error": error_msg}
        try:
            # Safely encode the error message
            yield f"data: {json.dumps(error_data, ensure_ascii=True)}\n\n"
        except Exception:
            # Ultimate fallback with safe string
            yield f"data: {json.dumps({'error': 'An error occurred during streaming'})}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/v1/chat/completions")
async def create_chat_completion(request: ChatCompletionRequest):
    """
    Generates a chat completion. Now supports combining a `prompt_type`
    (as a system prompt) with a list of `messages`.
    """
    base_messages = []
    user_messages = []

    if request.prompt_type:
        try:
            rendered = prompt_registry.render(
                prompt_id=request.prompt_type,
                version=request.prompt_version,
                vars=request.prompt_vars,
            )
            if rendered.get("form") == "messages":
                base_messages = rendered["messages"]
            else:
                base_messages = [{"role": "user", "content": rendered["prompt"]}]
        except (PromptNotFound, PromptRenderError, PromptValidationError) as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if request.messages:
        user_messages = [msg.model_dump() for msg in request.messages]

    messages_dict = base_messages + user_messages

    if not messages_dict:
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
                messages=messages_dict, request=request
            )

            if "usage" in response_data:
                usage = response_data["usage"]

                def safe_int_convert(value, default=0):
                    """Safely convert a value to int, handling dicts and non-numeric values."""
                    if value is None:
                        return default
                    if isinstance(value, dict):
                        # If it's a dict, try to extract a reasonable numeric value
                        # Common patterns: {"total": 123} or {"value": 123}
                        for key in ["total", "value", "count", "tokens"]:
                            if key in value and isinstance(
                                value[key], (int, float, str)
                            ):
                                try:
                                    return int(float(value[key]))
                                except (ValueError, TypeError):
                                    continue
                        return default
                    try:
                        return int(float(value))
                    except (ValueError, TypeError):
                        return default

                response_data["usage"] = {
                    "completion_tokens_details": safe_int_convert(
                        usage.get("completion_tokens_details")
                    ),
                    "prompt_tokens_details": safe_int_convert(
                        usage.get("prompt_tokens_details")
                    ),
                    "queue_time": safe_int_convert(usage.get("queue_time")),
                    "prompt_time": safe_int_convert(usage.get("prompt_time")),
                    "completion_time": safe_int_convert(usage.get("completion_time")),
                    "total_time": safe_int_convert(usage.get("total_time")),
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
