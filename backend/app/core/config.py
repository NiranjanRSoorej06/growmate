from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_DIR / ".env", BACKEND_DIR / ".env"),
        extra="ignore",
    )

    # Local AI (Ollama + Gemma)
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma3:4b"
    ollama_timeout: float = 120.0
    ollama_max_tokens: int = 1500

    # Storage
    database_path: str = str(BACKEND_DIR / "growmate.db")
    catalog_path: str = str(REPO_DIR / "data" / "plant_catalog.json")

    # HTTP
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Optional integrations
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    serpapi_key: str = ""
    external_timeout: float = 10.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
