import { useEffect, useSyncExternalStore } from "react";
import type { SessionState } from "../session.types";
import { useChatRegistry } from "./useChatRegistry";

/** Binds the view to ONE conversation's session. Resolves the persistent instance from
 *  the registry and subscribes to its snapshot. For an existing conversation it loads
 *  history once; for a freshly minted chat (`isNew`) it skips the fetch so the greeting
 *  shows immediately. Switching `routeId` just swaps which session this component watches
 *  — the others keep running untouched. */
export function useChatSession(routeId: string, isNew: boolean): SessionState {
  const registry = useChatRegistry();
  const session = registry.getOrCreate(routeId);

  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);

  useEffect(() => {
    if (isNew) session.markHistoryLoaded();
    else void session.ensureHistory();
  }, [routeId, session, isNew]);

  return state;
}
