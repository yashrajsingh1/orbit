"""
ORBIT - Personal Cognitive Operating System
Core Configuration Module
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "ORBIT"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://orbit:orbit_secret@localhost:5432/orbit_db"
    )
    database_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AI / LLM
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096

    # Security
    secret_key: str = "change_this_in_production"
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"

    # Voice
    whisper_model: str = "base"
    enable_voice: bool = True

    # Vector Store
    vector_dimension: int = 1536
    vector_index_path: str = "./data/vector_index"

    # Feature Flags
    enable_websockets: bool = True
    enable_memory_persistence: bool = True
    enable_cognitive_profiling: bool = True

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
