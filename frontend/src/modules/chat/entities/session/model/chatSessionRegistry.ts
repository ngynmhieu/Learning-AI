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

  /** Return the session for `id`, creating an empty one if needed. */
  getOrCreate(id: string): ChatSession {
    let session = this.sessions.get(id);
    if (!session) {
      session = new ChatSession(id);
      this.sessions.set(id, session);
    }
    return session;
  }
}
