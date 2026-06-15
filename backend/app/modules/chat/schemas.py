"""Pydantic models for the chat API boundary (request/response shapes)."""
from typing import List, Optional
from pydantic import BaseModel, Field


class Message(BaseModel):
    """A single message in the chat history."""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    messages: List[Message] = Field(..., description="Chat history including the latest user message")
    max_tokens: Optional[int] = Field(None, description="Max tokens to generate (uses default if not specified)")
    enable_thinking: Optional[bool] = Field(False, description="Enable extended thinking mode")
    model: Optional[str] = Field(None, description="Model id to use (falls back to the configured default)")


class ChatResponse(BaseModel):
    """Response body for chat endpoint."""
    response: str = Field(..., description="Generated assistant response")
    elapsed_time: float = Field(..., description="Time taken to generate response in seconds")
    tokens_generated: Optional[int] = Field(None, description="Number of tokens generated")


class StreamChunk(BaseModel):
    """A single chunk of streamed response."""
    chunk: str = Field(..., description="Token or partial text chunk")
    elapsed_time: Optional[float] = Field(None, description="Elapsed time so far")


class ModelInfo(BaseModel):
    """One model in the models service catalog."""
    id: str = Field(..., description="Model id clients can request")
    description: str = Field("", description="Human-readable description")
    loaded: bool = Field(False, description="Whether this model is currently resident")


class ModelsResponse(BaseModel):
    """Response body for the models listing endpoint."""
    count: int = Field(..., description="Number of models available")
    models: List[ModelInfo] = Field(..., description="The available models")
