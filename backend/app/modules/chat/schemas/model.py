"""Models-catalog response shapes (backend → client) for `GET /models`."""
from typing import List

from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    """One model in the models service catalog."""
    id: str = Field(..., description="Model id clients can request")
    description: str = Field("", description="Human-readable description")
    loaded: bool = Field(False, description="Whether this model is currently resident")


class ModelsResponse(BaseModel):
    """Body for `GET /models`."""
    count: int = Field(..., description="Number of models available")
    models: List[ModelInfo] = Field(..., description="The available models")
