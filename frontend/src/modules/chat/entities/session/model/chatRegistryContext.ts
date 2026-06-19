import { createContext } from "react";
import type { ChatSessionRegistry } from "./chatSessionRegistry";

/** Provides the per-user ChatSessionRegistry to the chat pages and the send feature. */
export const ChatRegistryContext = createContext<ChatSessionRegistry | null>(null);
