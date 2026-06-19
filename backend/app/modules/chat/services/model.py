"""Model catalog + models-service health — the stateless singleton relay.

Holds no model internals and owns no per-request state; it depends only on the
injected LlmClient and is built once during the app lifespan (stored on app.state).
The actual model runs in the standalone models service.
"""
from typing import Any, Dict

from backend.app.shared.llm import LlmClient


class ModelService:
    def __init__(self, llm_client: LlmClient):
        self._llm = llm_client

    async def list_models(self) -> Dict[str, Any]:
        """Return the available models and their count."""
        models = await self._llm.list_models()
        return {"count": len(models), "models": models}

    async def health_check(self) -> Dict[str, Any]:
        return {"status": "ok", **await self._llm.health()}
