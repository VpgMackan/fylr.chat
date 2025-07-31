from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    db_host: str = None
    db_port: str = None
    db_user: str = None
    db_pass: str = None
    db_name: str = None

    ai_gateway_url: str = "http://localhost:8000"


settings = Settings()
