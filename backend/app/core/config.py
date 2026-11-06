from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ShebaPath BD"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://shebapath:shebapath@localhost:5432/shebapath"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:3000"

    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-5-5"

    embedding_provider: str = "hash"  # "openai" | "hash"
    embedding_api_key: str = ""
    embedding_base_url: str = "https://api.openai.com/v1"
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    rag_top_k: int = 5
    rag_max_distance: float = 0.8

    rate_limit_per_minute: int = 120
    ai_rate_limit_per_minute: int = 20
    auth_rate_limit_per_minute: int = 10

    admin_email: str = "admin@shebapath.local"
    admin_password: str = "ChangeMe-Admin-123"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
