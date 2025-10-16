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

    s3_endpoint: Optional[str] = None
    s3_port: Optional[str] = None
    s3_key_id: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_region: str = "garage"
    s3_bucket_podcast_audio: str = "fylr.chat-podcasts"

    # RabbitMQ settings
    rabbitmq_host: str = "localhost"
    rabbitmq_port: int = 5672
    rabbitmq_user: str = "guest"
    rabbitmq_password: str = "guest"
    rabbitmq_heartbeat: int = 600  # 10 minutes for long-running tasks
    rabbitmq_blocked_connection_timeout: int = 300  # 5 minutes


settings = Settings()
