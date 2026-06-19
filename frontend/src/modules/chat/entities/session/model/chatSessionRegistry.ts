import { ChatSession } from "./chatSession";

/** Holds one ChatSession per conversation, keyed by its id. Because the instances live
 *  here — not in any component — their streams survive navigation, and each conversation
 *  is fully isolated from the others. One registry exists per signed-in session (created
 *  by ChatSessionsProvider). */
export class ChatSessionRegistry {
  private readonly sessions = new Map<string, ChatSession>();

  get(id: string): ChatSession | undefined {
    return this.sessions.get(id);
  }

  /** Return the session for `id`, creating one if needed. A brand-new session for an
   *  existing (not `isNew`) conversation kicks off `ensureHistory()` right here — still
   *  synchronous with the caller's render — so its status is already "loading" by the
   *  time `useSyncExternalStore` takes its first read. Without this, the constructor's
   *  "idle" default would paint one frame (the greeting) before the effect that used to
   *  start the fetch could flip it to "loading", producing a visible flash on every
   *  conversation switch. `isNew` only matters for this initial creation; an
   *  already-registered session ignores it. */
  getOrCreate(id: string, isNew = false): ChatSession {
    let session = this.sessions.get(id);
    if (!session) {
      session = new ChatSession(id);
      this.sessions.set(id, session);
      if (isNew) session.markHistoryLoaded();
      else void session.ensureHistory();
    }
    return session;
  }
}
