"""Configuration and environment settings for AI CyberShield ML Microservice."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings validated at startup via pydantic-settings."""

    # Service Network Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 7860  # Default port expected by Hugging Face Spaces Docker
    ENVIRONMENT: str = "development"
    APP_NAME: str = "AI CyberShield ML Microservice"
    VERSION: str = "0.1.0"

    # Security & API Key
    # Required in production: will fail if empty/default
    ML_API_KEY: str = "default_insecure_key_change_in_production"

    # Batch Limits
    MAX_BATCH_SIZE: int = 500
    MAX_REQUEST_BODY_BYTES: int = 2 * 1024 * 1024  # 2MB

    # Rate Limiting
    RATE_LIMIT_GLOBAL: str = "100/minute"
    RATE_LIMIT_PREDICT: str = "60/minute"
    RATE_LIMIT_BATCH: str = "30/minute"

    # Artifact Paths
    ARTIFACTS_DIR: Path = Path(__file__).resolve().parent.parent / "artifacts"
    MODEL_PATH: Path = ARTIFACTS_DIR / "model.joblib"
    PREPROCESSOR_PATH: Path = ARTIFACTS_DIR / "preprocessor.joblib"
    SCHEMA_PATH: Path = ARTIFACTS_DIR / "feature_schema.json"
    METRICS_PATH: Path = ARTIFACTS_DIR / "metrics.json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
