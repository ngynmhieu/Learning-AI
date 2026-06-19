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
  conversation_id?: string;
}

export interface ChatResponse {
  response: string;
  elapsed_time: number;
}

export interface StreamChunk {
  type?: "thinking" | "text" | "meta";
  chunk?: string;
  conversation_id?: string;
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

/** Backend (snake_case) shapes for the conversation endpoints. */
export interface ConversationSummaryDto {
  id: string;
  title: string;
  updated_at: string;
}

export interface ConversationMessageDto {
  id: string;
  role: string;
  content: string;
  thinking: string | null;
  created_at: string;
}

export interface ConversationDetailDto extends ConversationSummaryDto {
  messages: ConversationMessageDto[];
}

export interface GeneratedTitleDto {
  title: string;
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

  async listConversations(): Promise<ConversationSummaryDto[]> {
    const res = await fetchWithToken("/conversations");
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Failed to load conversations");
    }
    return res.json();
  },

  async getConversation(id: string): Promise<ConversationDetailDto> {
    const res = await fetchWithToken(`/conversations/${id}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Failed to load conversation");
    }
    return res.json();
  },

  async generateTitle(id: string): Promise<GeneratedTitleDto> {
    const res = await fetchWithToken(`/conversations/${id}/title`, { method: "POST" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Failed to generate title");
    }
    return res.json();
  },

  async renameConversation(id: string, title: string): Promise<void> {
    const res = await fetchWithToken(`/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Failed to rename conversation");
    }
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetchWithToken(`/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail ?? "Failed to delete conversation");
    }
  },
};
