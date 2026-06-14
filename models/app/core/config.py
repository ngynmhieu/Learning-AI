"""Service (transport) settings only. Model config lives in each model's JSON
under app/modules/llm/models/."""
import os


class Settings:
    host: str = os.getenv("MODELS_HOST", "0.0.0.0")
    port: int = int(os.getenv("MODELS_PORT", "8001"))


settings = Settings()
