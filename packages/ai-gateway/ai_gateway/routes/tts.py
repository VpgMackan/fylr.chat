import logging
from opentelemetry import trace
from fastapi import APIRouter, HTTPException, status, Response

from ai_gateway.providers import providers

router = APIRouter()
log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


@router.post("/v1/tts")
async def text_to_speech(request: dict):
    provider_name = request.get("provider", "elevenlabs")
    model = request.get("model")

    with tracer.start_as_current_span("text_to_speech") as span:
        span.set_attribute("provider", provider_name)
        span.set_attribute("model", model or "default")
        span.set_attribute("text_length", len(request.get("text", "")))

        log.info(
            "TTS request",
            extra={
                "provider": provider_name,
                "model": model,
                "text_length": len(request.get("text", "")),
            },
        )

        try:
            response = providers[provider_name].generate_text_to_speech(
                text=request["text"],
                model=model,
                voice=request.get("voice"),
                options=request.get("options", {}),
            )
            log.info("TTS success", extra={"provider": provider_name, "model": model})
            return Response(content=response, media_type="audio/mpeg")
        except Exception as e:
            log.error("TTS error", extra={"error": str(e), "provider": provider_name})
            span.set_attribute("error", True)
            span.record_exception(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred with the '{provider_name}' provider: {e}",
            )
