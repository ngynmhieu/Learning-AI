"""Configuration loader for the backend."""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from backend/.env.backend file
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env.backend")


class Settings:
    """Application settings loaded from environment variables."""

    # Models service — the standalone model server this backend calls over HTTP.
    # MODEL_NAME is the model *id* to request (e.g. "qwen3.5-9b"), not a weights path.
    # Quantization / GPU / weights are the models service's concern, not the backend's.
    models_service_url: str = os.getenv("MODELS_SERVICE_URL", "http://localhost:8001/v1")
    model_name: str = os.getenv("MODEL_NAME", "qwen3.5-9b")
    models_service_api_key: str = os.getenv("MODELS_SERVICE_API_KEY", "")

    # Server configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # Database configuration (Supabase Postgres — async driver)
    database_url: str = os.getenv("DATABASE_URL", "")

    # Supabase Auth — used to verify JWTs and read the user behind a token
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")


settings = Settings()
