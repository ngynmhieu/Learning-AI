import { useContext } from "react";
import { ConversationsContext } from "./conversationsContext";

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used inside ConversationsProvider");
  return ctx;
}
