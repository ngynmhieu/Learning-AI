import { useCallback, useEffect, useMemo, useState } from "react";
import { chatApi, type ConversationSummaryDto } from "@/shared/api";
import { useSession } from "@/modules/auth";
import type { Conversation } from "../conversation.types";
import { ConversationsContext } from "./conversationsContext";

function toConversation(dto: ConversationSummaryDto): Conversation {
  return { id: dto.id, title: dto.title, updatedAt: Date.parse(dto.updated_at) };
}

/** Single source of truth for the sidebar conversation list, shared by the
 *  sidebar widget and the chat pages. Mirrors the AuthProvider pattern. */
export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load — no synchronous setState in the effect body.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    chatApi
      .listConversations()
      .then((list) => {
        if (cancelled) return;
        setConversations(list.map(toConversation));
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [status]);

  const upsert = useCallback((conversation: Conversation) => {
    setConversations((prev) => [conversation, ...prev.filter((c) => c.id !== conversation.id)]);
  }, []);

  const bump = useCallback((id: string) => {
    setConversations((prev) => {
      const found = prev.find((c) => c.id === id);
      if (!found) return prev;
      return [{ ...found, updatedAt: Date.now() }, ...prev.filter((c) => c.id !== id)];
    });
  }, []);

  const applyTitle = useCallback((id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const rename = useCallback(
    async (id: string, title: string) => {
      await chatApi.renameConversation(id, title);
      applyTitle(id, title);
    },
    [applyTitle]
  );

  const remove = useCallback(async (id: string) => {
    await chatApi.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ conversations, loading, error, upsert, bump, applyTitle, rename, remove }),
    [conversations, loading, error, upsert, bump, applyTitle, rename, remove]
  );

  return (
    <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
  );
}
