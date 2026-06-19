import type { Message } from "../message";

export type SessionStatus = "idle" | "loading" | "streaming" | "error";

/** The full, immutable snapshot a view renders. A new object is produced on every
 *  change so `useSyncExternalStore` can detect updates by reference. */
export interface SessionState {
  /** The conversation id — minted by the frontend before the chat opens, so it's
   *  always present (no draft/null phase). */
  conversationId: string;
  messages: Message[];
  status: SessionStatus;
}

/** What the composer hands the session to start one turn. */
export interface RunTurnArgs {
  content: string;
  model: string | null;
  enableThinking: boolean;
}

/** Cross-cutting reactions the session reports but does not own (sidebar, titling).
 *  The session stays pure; the caller wires these to the app. `isFirst` = this turn is
 *  the conversation's first message (so the caller adds it to the sidebar + titles it). */
export interface RunTurnHooks {
  /** Fired as the turn starts, before streaming. */
  onTurnStart?: (id: string, isFirst: boolean) => void;
  /** Fired once the stream finishes cleanly. */
  onComplete?: (id: string, isFirst: boolean) => void;
}
