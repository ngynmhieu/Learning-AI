"""The `llm` module — serves transformers chat LLMs (Qwen today).

Self-contained: model configs (`models/*.json` + `config.py`), decoding helpers
(`processors.py`), lifecycle + two-phase inference (`manager.py`), API
orchestration (`service.py`), and routes (`router.py`).
"""
from .router import router

__all__ = ["router"]
