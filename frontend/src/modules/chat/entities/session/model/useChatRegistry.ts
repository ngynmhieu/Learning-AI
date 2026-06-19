import { useContext } from "react";
import { ChatRegistryContext } from "./chatRegistryContext";

export function useChatRegistry() {
  const registry = useContext(ChatRegistryContext);
  if (!registry) throw new Error("useChatRegistry must be used inside ChatSessionsProvider");
  return registry;
}
