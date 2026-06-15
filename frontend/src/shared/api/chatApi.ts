import { fetchWithToken } from "@/shared/lib";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  enable_thinking?: boolean;
  model?: string;
}

export interface ChatResponse {
  response: string;
  elapsed_time: number;
}

export interface StreamChunk {
  type?: "thinking" | "text";
  chunk?: string;
  done?: boolean;
  error?: string;
}

export interface ModelInfo {
  id: string;
  description: string;
  loaded: boolean;
}

export interface ModelsResponse {
  count: number;
  models: ModelInfo[];
}

export const chatApi = {
  async *stream(
    body: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const res = await fetchWithToken("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Stream request failed");
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.slice(6).trim();
          if (json) yield JSON.parse(json) as StreamChunk;
        }
      }
    }
  },

  async listModels(): Promise<ModelsResponse> {
    const res = await fetchWithToken("/models");
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Failed to load models");
    }
    return res.json();
  },
};
