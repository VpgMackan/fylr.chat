import httpx
from elevenlabs import ElevenLabs
from typing import Dict, Any
import structlog

from ..base import BaseProvider
from ...config import settings

log = structlog.get_logger()


class ElevenLabsProvider(BaseProvider):
    def __init__(self):
        if not settings.elevenlabs_api_key:
            log.warn("elevenlabs_api_key_not_set")
            self.client = None
        else:
            self.client = ElevenLabs(api_key=settings.elevenlabs_api_key)

    def generate_text_to_speech(
        self, text: str, model: str, voice: str, options: Dict[str, Any]
    ):
        """
        Generates text-to-speech audio using ElevenLabs.
        """
        if not self.client:
            raise ValueError("ElevenLabs API key is not configured")

        try:
            # ElevenLabs specific options
            stability = options.get("stability", 0.5)
            similarity_boost = options.get("similarity_boost", 0.5)
            style = options.get("style", 0.0)
            use_speaker_boost = options.get("use_speaker_boost", True)

            voice_settings = {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "use_speaker_boost": use_speaker_boost,
            }

            # Generate audio
            audio = self.client.generate(
                text=text,
                voice=voice,
                model=model,
                voice_settings=voice_settings,
            )

            # Convert generator to bytes
            audio_bytes = b"".join(audio)
            return audio_bytes

        except Exception as e:
            log.error("elevenlabs_tts_error", error=str(e))
            raise Exception(f"ElevenLabs TTS error: {e}") from e
