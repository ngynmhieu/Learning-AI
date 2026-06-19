import { useState } from "react";
import { ChatSessionRegistry } from "./chatSessionRegistry";
import { ChatRegistryContext } from "./chatRegistryContext";

/** Owns the lifetime of the ChatSessionRegistry. Mounted inside ProtectedRoute so the
 *  registry (and any background streams) is created per signed-in user and torn down on
 *  logout. It holds NO chat logic — that lives in the sessions themselves and the
 *  send-message feature. The lazy state initializer builds the registry exactly once. */
export function ChatSessionsProvider({ children }: { children: React.ReactNode }) {
  const [registry] = useState(() => new ChatSessionRegistry());

  return (
    <ChatRegistryContext.Provider value={registry}>
      {children}
    </ChatRegistryContext.Provider>
  );
}
