import uvicorn
import logging

from fastapi import FastAPI
from asgi_correlation_id import CorrelationIdMiddleware

from .telemetry import setup_telemetry, instrument_app
from .config import settings
from .routes.chat import router as chat_router
from .routes.embedding import router as embedding_router
from .routes.tts import router as tts_router
from .routes.rerank import router as rerank_router

# Setup telemetry before app creation
setup_telemetry(settings.otel_service_name)
log = logging.getLogger(__name__)

app = FastAPI(
    title="AI Gateway",
    description="A unified API for multiple AI providers.",
    version="1.0.0",
)

# Add middleware and instrumentation
app.add_middleware(CorrelationIdMiddleware)
instrument_app(app)

# --- API Endpoints ---
app.include_router(chat_router)
app.include_router(embedding_router)
app.include_router(tts_router)
app.include_router(rerank_router)


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
