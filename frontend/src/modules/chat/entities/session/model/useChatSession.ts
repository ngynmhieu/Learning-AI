import { useSyncExternalStore } from "react";
import type { SessionState } from "../session.types";
import { useChatRegistry } from "./useChatRegistry";

/** Binds the view to ONE conversation's session. Resolves the persistent instance from
 *  the registry — which, for an existing conversation, already kicked off the history
 *  fetch synchronously on creation (see ChatSessionRegistry.getOrCreate), so the very
 *  first snapshot read here already reflects "loading" rather than the constructor's
 *  "idle" default. For a freshly minted chat (`isNew`) history is skipped entirely so
 *  the greeting shows immediately. Switching `routeId` just swaps which session this
 *  component watches — the others keep running untouched. */
export function useChatSession(routeId: string, isNew: boolean): SessionState {
  const registry = useChatRegistry();
  const session = registry.getOrCreate(routeId, isNew);

  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}
