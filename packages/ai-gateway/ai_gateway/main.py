import uvicorn

from fastapi import FastAPI

from .logging_config import configure_logging
import structlog
from asgi_correlation_id import CorrelationIdMiddleware

from .config import settings
from .routes.chat import router as chat_router
from .routes.embedding import router as embedding_router

app = FastAPI(
    title="AI Gateway",
    description="A unified API for multiple AI providers.",
    version="1.0.0",
)

app.add_middleware(CorrelationIdMiddleware)


configure_logging(log_level="INFO", json_logs=False)
log = structlog.get_logger()

# --- API Endpoints ---
app.include_router(chat_router)
app.include_router(embedding_router)


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
