from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="TASKBOARD_",
        extra="ignore",
    )

    secret_key: str = Field(
        ...,
        description="JWT signing secret; must be set via environment",
    )
    database_url: str = "sqlite:///./taskboard.db"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    @field_validator("secret_key")
    @classmethod
    def secret_must_be_strong_enough(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 16:
            raise ValueError("TASKBOARD_SECRET_KEY must be at least 16 characters")
        return stripped

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
