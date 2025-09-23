from fastapi import APIRouter, HTTPException, status, Response

from ai_gateway.providers import providers

router = APIRouter()


@router.post("/v1/tts")
async def text_to_speech(request: dict):
    try:
        response = providers[request["provider"]].generate_text_to_speech(
            text=request["text"],
            model=request["model"],
            voice=request.get("voice"),
            options=request.get("options", {}),
        )
        return Response(content=response, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred with the '{request['provider']}' provider: {e}",
        )
