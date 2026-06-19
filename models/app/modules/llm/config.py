"""Model configuration — loaded entirely from `models/*.json`.

Adding a model is just dropping a JSON file in `models/`; there's no code to
touch here. SamplingConfig mirrors a model's optional `sampling` block.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

MODELS_DIR = Path(__file__).resolve().parent / "models"


@dataclass(frozen=True)
class SamplingConfig:
    """Decoding/sampling knobs, loaded from a model's `sampling` JSON block.

    Defaults follow Unsloth's Qwen3.5 thinking-mode recommendation. presence_penalty
    is applied via PresencePenaltyLogitsProcessor (transformers has no native one).
    """
    temperature: float = 1.0
    top_p: float = 0.95
    top_k: int = 20
    min_p: float = 0.0
    presence_penalty: float = 0.0

    @classmethod
    def from_dict(cls, data: dict) -> "SamplingConfig":
        return cls(
            temperature=data.get("temperature", 1.0),
            top_p=data.get("top_p", 0.95),
            top_k=data.get("top_k", 20),
            min_p=data.get("min_p", 0.0),
            presence_penalty=data.get("presence_penalty", 0.0),
        )


@dataclass(frozen=True)
class ModelConfig:
    """One model's settings, loaded from its JSON file."""
    id: str
    hf_repo: str
    quantize: str = "none"          # "4bit" | "8bit" | "none"
    max_new_tokens: int = 1024
    supports_thinking: bool = False
    max_thinking_tokens: int = 1024
    # Natural-language nudge + </think> injected when the thinking budget is hit,
    # so an over-budget thought lands gracefully instead of being cut mid-word.
    thinking_budget_message: str = "\n\n</think>\n\n"
    sampling: Optional[SamplingConfig] = None
    description: str = ""
    default: bool = False

    @classmethod
    def from_file(cls, path: Path) -> "ModelConfig":
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            id=data["id"],
            hf_repo=data["hf_repo"],
            quantize=data.get("quantize", "none"),
            max_new_tokens=data.get("max_new_tokens", 1024),
            supports_thinking=data.get("supports_thinking", False),
            max_thinking_tokens=data.get("max_thinking_tokens", 1024),
            thinking_budget_message=data.get("thinking_budget_message", "\n\n</think>\n\n"),
            sampling=SamplingConfig.from_dict(data["sampling"]) if "sampling" in data else None,
            description=data.get("description", ""),
            default=data.get("default", False),
        )


def load_catalog() -> Dict[str, ModelConfig]:
    """Read every models/*.json into a {id: ModelConfig} map."""
    configs = [ModelConfig.from_file(p) for p in sorted(MODELS_DIR.glob("*.json"))]
    return {c.id: c for c in configs}
