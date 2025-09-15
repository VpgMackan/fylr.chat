from pathlib import Path
from typing import Optional

import uvicorn

from fastapi import FastAPI, HTTPException, status, Depends

from .logging_config import configure_logging
import structlog
from asgi_correlation_id import CorrelationIdMiddleware

from .prompts.registry import (
    PromptRegistry,
    PromptNotFound,
)

from .config import settings
from .routes.chat import router as chat_router
from .routes.embedding import router as embedding_router

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


# --- API Endpoints ---
app.include_router(chat_router)
app.include_router(embedding_router)


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
