from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    ai_gateway_port: str

    openai_api_key: Optional[str] = None
    llm_proxy_url: Optional[str] = None

    jina_api_key: Optional[str] = None
    jina_api_url: str = "https://api.jina.ai/v1"


settings = Settings()
