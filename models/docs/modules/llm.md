# `llm` Module — Technical Reference

The `llm` module runs text chat LLMs locally using HuggingFace Transformers and
exposes them over an OpenAI-compatible HTTP API. It is the only module today; a
future model type (e.g. embedding, vision) would be a sibling module.

For the overall service architecture and why this service exists as a separate
process, see [`docs/models_guideline.md`](../../models_guideline.md).

---

## File map

```
modules/llm/
├── config.py          configuration dataclasses (SamplingConfig, ModelConfig)
├── processors.py      decoding-control helpers (logits processors, stream stripper)
├── manager.py         model lifecycle + two-phase inference (LlmManager)
├── service.py         OpenAI protocol translation + SSE (LlmService)
├── schemas.py         request/response shapes (Pydantic)
├── router.py          HTTP endpoints (FastAPI, thin)
├── dependencies.py    FastAPI Depends providers
└── models/
    └── qwen3.5-9b.json   one JSON file per model — adding a model = adding a file
```

Call path for a streaming request:

```
POST /v1/chat/completions
  router.chat_completions()
    service.complete(req)
      manager.ensure(req.model)     ← swap to the requested model if needed
      manager.stream(messages, ...) ← two-phase inference
        yield ("thinking", chunk)   ← Phase 1
        yield ("text", chunk)       ← Phase 2
      service._sse()                ← format as SSE frames
```

---

## 1. Configuration (`config.py`)

All per-model settings live in JSON files. `config.py` defines the dataclasses
that load them — there is no code to touch when adding a model.

### `ModelConfig` fields

| Field | Type | Default | Meaning |
|---|---|---|---|
| `id` | `str` | required | ID clients send in `"model": "..."` |
| `hf_repo` | `str` | required | HuggingFace repo slug |
| `quantize` | `str` | `"none"` | `"4bit"` · `"8bit"` · `"none"` |
| `max_new_tokens` | `int` | `1024` | Token cap for the answer phase |
| `supports_thinking` | `bool` | `false` | Enables the two-phase thinking flow |
| `max_thinking_tokens` | `int` | `1024` | Token cap for the thinking phase |
| `thinking_budget_message` | `str` | `"\n\n</think>\n\n"` | Text injected when thinking budget is exhausted before `</think>` |
| `sampling` | `SamplingConfig?` | `null` | Sampler knobs; `null` → greedy decoding |
| `description` | `str` | `""` | Shown in `GET /v1/models` |
| `default` | `bool` | `false` | Exactly one model should be `true` → loaded on startup |

### `SamplingConfig` fields (inside `"sampling": {}`)

| Field | Type | Default | Meaning |
|---|---|---|---|
| `temperature` | `float` | `1.0` | Sampling temperature |
| `top_p` | `float` | `0.95` | Nucleus sampling probability |
| `top_k` | `int` | `20` | Top-K candidates per step |
| `min_p` | `float` | `0.0` | Minimum probability threshold |
| `presence_penalty` | `float` | `0.0` | Flat logit penalty for tokens already generated (see §3) |

Defaults match Unsloth's Qwen3.5 thinking-mode recommendation. If `"sampling"`
is omitted from the JSON entirely, generation falls back to greedy decoding.

### Full example (`qwen3.5-9b.json`)

```json
{
  "id": "qwen3.5-9b",
  "hf_repo": "Qwen/Qwen3.5-9B",
  "quantize": "4bit",
  "max_new_tokens": 1024,
  "supports_thinking": true,
  "max_thinking_tokens": 512,
  "thinking_budget_message": "\n\n(Reasoning budget reached — time to give the final answer.)\n</think>\n\n",
  "sampling": {
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 20,
    "min_p": 0.0,
    "presence_penalty": 1.5
  },
  "description": "Qwen3.5 9B · 256K context · linear attention · 4-bit.",
  "default": true
}
```

---

## 2. Inference — the two-phase thinking flow (`manager.py`)

Qwen3.5 (and similar models) supports a "thinking" mode where the model reasons
through a problem inside `<think>…</think>` before giving the final answer.

### Why two phases?

Naively calling `model.generate(max_new_tokens=1024)` with thinking enabled means
thinking and answering share one token budget. On hard questions the model can
consume all 1024 tokens thinking, leaving nothing for the actual answer.

The two-phase approach gives each stage its own independent budget:

```
Phase 1 — thinking
  Input:  [prompt] + <think>\n           (appended by apply_chat_template)
  Output: reasoning text
  Cap:    max_thinking_tokens (e.g. 512)
  Stop:   </think> emitted, or budget exhausted

Phase 2 — answer
  Input:  [prompt] + <think>\n[reasoning]</think>\n\n
  Output: the final response
  Cap:    max_new_tokens (e.g. 1024)   ← fresh budget, unaffected by Phase 1
```

### How the model "knows" it's in thinking mode

`apply_chat_template(enable_thinking=True)` appends `<think>\n` to the formatted
prompt. The model was trained to continue with reasoning content when it sees an
unclosed `<think>` tag, then emit `</think>` when done. Phase 2 starts from the
closed `</think>` boundary, so the model continues into the answer naturally.

### Graceful budget handling

Two mechanisms prevent a hard mid-sentence cut when thinking hits the cap:

**1. `ThinkingBudgetProcessor`** (proactive, preferred)

From 75% of `max_thinking_tokens` onward, the logit of the first `</think>` token
gets a linearly increasing boost — from `+0` at 75% to `+15.0` at 100%. The model
feels a growing pull toward closing its thought and tends to pick a natural sentence
boundary before the hard limit.

**2. `_append_close`** (safety net)

If the budget runs out despite the boost and `</think>` was never emitted, the
manager appends `thinking_budget_message` (a text nudge + `</think>`) directly
onto the token sequence before starting Phase 2. This is the fallback.

### Streaming specifics

`model.generate()` is blocking. To stream, it runs in a background daemon thread
while `TextIteratorStreamer` yields decoded chunks on the main thread. A `holder`
dict captures the return value (the full output tensor) once the thread finishes —
this tensor is needed to start Phase 2 without re-running Phase 1.

`CloseStripper` filters the Phase 1 stream: it buffers up to 7 characters of tail
(length of `</think>`) and drops the tag if it appears, so the caller only ever
receives clean thinking text.

---

## 3. Decoding helpers (`processors.py`)

### `PresencePenaltyLogitsProcessor`

HuggingFace Transformers has no native `presence_penalty` — only a multiplicative
`repetition_penalty` that Unsloth explicitly recommends disabling for Qwen3.5.

This processor subtracts a flat value from the logit of every token that already
appeared *after* the prompt. It deliberately skips the prompt span so words from
the user's question are not penalized.

```
scores[token] -= penalty   for every token already generated
```

With `presence_penalty = 1.5`, this breaks the repetition loops that cause Qwen3.5
to think endlessly (research shows 84% of truncated thinking outputs were stuck in
>30% repetition loops).

### `ThinkingBudgetProcessor`

Applied in Phase 1 only. Counts tokens as they are generated and once past
`warn_start` (75% of budget), ramps a logit boost on the first token of `</think>`:

```
boost = progress * max_boost   where progress ∈ [0, 1] over the final 25%
```

Boosting only the *first* token of `</think>` is sufficient: once the model commits
to it, the KV cache makes subsequent tokens in the tag very likely by continuation.

### `CloseStripper`

A stateful stream filter. Because `StopStringCriteria` fires *after* the `</think>`
token is generated (not before), the streamer may include it in a chunk. The
stripper buffers the last 7 characters and discards `</think>` if it appears,
passing all other text through unchanged. `flush()` must be called after the stream
ends to emit any tail that was held back.

---

## 4. Model lifecycle (`manager.py`)

`LlmManager` is a module-level singleton (`manager = LlmManager()`). It holds one
model resident at a time and serializes load/swap operations with a threading lock
so an in-flight generation can't race a model swap.

### Load

`ensure(model_id)` checks if the requested model is already resident. If not, it
unloads the current model (frees GPU memory, empties CUDA cache) then loads the
new one:

1. `AutoTokenizer.from_pretrained(hf_repo)` — download/cache the tokenizer
2. `AutoModelForImageTextToText.from_pretrained(...)` with a fallback to
   `AutoModelForCausalLM` — newer Qwen models ship as multimodal and are not
   registered under the causal-LM auto class
3. Apply quantization config (`BitsAndBytesConfig`) if `quantize` is `"4bit"` or
   `"8bit"`
4. Cache the first token ID of `</think>` for `ThinkingBudgetProcessor`

The default model (marked `"default": true` in its JSON) is loaded at service
startup via `app/main.py`'s lifespan handler.

### Swap

Only one model can be resident. Requesting a different model (by sending a
different `"model"` field in the request) triggers an unload → load cycle. Swap
latency is proportional to the model size — for a 4-bit 9B model, a few minutes.

---

## 5. API

### `GET /health`
```json
{ "status": "ok", "loaded_model": "qwen3.5-9b" }
```

### `GET /v1/models`
```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3.5-9b",
      "object": "model",
      "owned_by": "local",
      "description": "Qwen3.5 9B · 256K context · linear attention · 4-bit.",
      "loaded": true
    }
  ]
}
```

### `POST /v1/chat/completions`

**Request:**
```json
{
  "model": "qwen3.5-9b",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user",   "content": "Explain gravity." }
  ],
  "max_tokens": 512,
  "stream": true,
  "enable_thinking": true
}
```

`enable_thinking` is not a named field — it is passed via `extra_body` / request
extras and forwarded to `manager.stream()` as a passthrough kwarg. Any unrecognised
field in the request body is passed through the same way.

**Non-streaming response (`stream: false`):**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1718000000,
  "model": "qwen3.5-9b",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "text": "Gravity is ...",
      "thinking": "Let me think through this..."
    },
    "finish_reason": "stop"
  }]
}
```

**Streaming response (`stream: true`):**

SSE frames arrive in two types determined by the `delta` field:

```
data: {"choices": [{"delta": {"thinking": "Let me consider..."}}]}
data: {"choices": [{"delta": {"thinking": " the forces involved..."}}]}
data: {"choices": [{"delta": {"text": "Gravity is the attraction..."}}]}
data: {"choices": [{"delta": {}, "finish_reason": "stop"}]}
data: [DONE]
```

`thinking` chunks arrive first (Phase 1), then `text` chunks (Phase 2). The client
should buffer `thinking` chunks into one block and `text` chunks into the answer.
The `text`/`thinking` fields are non-standard OpenAI delta fields; they are
accessible via `choice.delta.model_extra` when using the OpenAI Python SDK.

---

## 6. Tuning guide

| Symptom | Knob | Where |
|---|---|---|
| Model still thinks too long | Lower `max_thinking_tokens` | JSON |
| Thinking cut off too early | Raise `max_thinking_tokens` or lower `warn_start` in `ThinkingBudgetProcessor` | JSON / `processors.py` |
| Thinking ends abruptly / incoherent | Raise `max_boost` in `ThinkingBudgetProcessor` | `processors.py` |
| Repetition loops in thinking | Raise `presence_penalty` (up to ~2.0) | JSON `sampling` block |
| Answer too short | Raise `max_new_tokens` | JSON |
| Output too random / hallucinating | Lower `temperature` toward `0.6` | JSON `sampling` block |
| Output too repetitive / boring | Raise `temperature` toward `1.0`, ensure `presence_penalty > 0` | JSON `sampling` block |
| No thinking block wanted | Set `"supports_thinking": false` or send `"enable_thinking": false` | JSON or request |
