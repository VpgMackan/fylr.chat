from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: str = "development"
    ai_gateway_port: int

    openai_api_key: Optional[str] = None
    llm_proxy_url: Optional[str] = None

    jina_api_key: Optional[str] = None
    jina_api_url: str = "https://api.jina.ai/v1"

    elevenlabs_api_key: Optional[str] = None
    elevenlabs_api_url: str = "https://api.elevenlabs.io"

    ollama_base_url: str = "http://localhost:11434/v1"

    posthog_api_key: Optional[str] = None
    posthog_host: str = "https://app.posthog.com"

    default_embedding_provider: str = "jina"
    default_embedding_model: str = "jina-clip-v2"


settings = Settings()
