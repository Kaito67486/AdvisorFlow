from functools import lru_cache

from pydantic import Field
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):
    app_env: str = Field(
        default="development",
        alias="APP_ENV",
    )

    app_name: str = Field(
        default="AdvisorFlow API",
        alias="APP_NAME",
    )

    app_host: str = Field(
        default="127.0.0.1",
        alias="APP_HOST",
    )

    app_port: int = Field(
        default=5000,
        alias="APP_PORT",
    )

    database_url: str = Field(
        alias="DATABASE_URL",
    )

    jwt_secret: str = Field(
        alias="JWT_SECRET",
    )

    jwt_expire_minutes: int = Field(
        default=480,
        alias="JWT_EXPIRE_MINUTES",
    )

    cors_origins: str = Field(
        default=(
            "http://127.0.0.1:5500,"
            "http://localhost:5500,"
            "http://127.0.0.1:5000,"
            "http://localhost:5000"
        ),
        alias="CORS_ORIGINS",
    )

    ai_provider: str = Field(
        default="mock",
        alias="AI_PROVIDER",
    )

    openai_api_key: str | None = Field(
        default=None,
        alias="OPENAI_API_KEY",
    )

    openai_transcription_model: str = Field(
        default="gpt-4o-mini-transcribe",
        alias="OPENAI_TRANSCRIPTION_MODEL",
    )

    openai_summary_model: str = Field(
        default="gpt-5-mini",
        alias="OPENAI_SUMMARY_MODEL",
    )

    max_audio_bytes: int = Field(
        default=24_000_000,
        alias="MAX_AUDIO_BYTES",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def is_production(self) -> bool:
        return (
            self.app_env.lower()
            == "production"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

google_client_id: str = Field(default="", alias="GOOGLE_CLIENT_ID")
google_client_secret: str = Field(default="", alias="GOOGLE_CLIENT_SECRET")
google_redirect_uri: str = Field(
    default="http://127.0.0.1:5000/auth/google/callback",
    alias="GOOGLE_REDIRECT_URI",
)