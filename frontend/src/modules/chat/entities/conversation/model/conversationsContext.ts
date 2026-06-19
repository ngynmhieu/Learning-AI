import { createContext } from "react";
import type { Conversation } from "../conversation.types";

export interface ConversationsContextValue {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  /** Insert or replace a conversation, moving it to the top. */
  upsert: (conversation: Conversation) => void;
  /** Move an existing conversation to the top (new activity). */
  bump: (id: string) => void;
  /** Update a conversation's title locally (e.g. from the SSE title event). */
  applyTitle: (id: string, title: string) => void;
  /** Persist a rename, then update locally. */
  rename: (id: string, title: string) => Promise<void>;
  /** Delete on the backend, then drop it locally. */
  remove: (id: string) => Promise<void>;
}

export const ConversationsContext = createContext<ConversationsContextValue | null>(null);
