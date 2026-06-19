import { chatApi } from "@/shared/api";
import type { Message, Role } from "../../message";
import { createMessage, updateLastMessage, appendToLastMessage } from "../../message";
import type { RunTurnArgs, RunTurnHooks, SessionState } from "../session.types";

const MAX_TOKENS = 1024;

/** One conversation's runtime, owning ITS OWN messages, status, and in-flight stream.
 *  Plain TS — no React, no router, no sidebar — so it lives outside the component tree
 *  and keeps streaming after you navigate away. A view binds to it with
 *  `useSyncExternalStore(session.subscribe, session.getSnapshot)`; mutations replace the
 *  immutable `state` object and notify subscribers. Instances are independent: stopping or
 *  streaming one can never touch another. */
export class ChatSession {
  private state: SessionState;
  private readonly listeners = new Set<() => void>();
  private controller: AbortController | null = null;
  private historyLoaded = false;

  constructor(conversationId: string) {
    this.state = { conversationId, messages: [], status: "idle" };
  }

  // ── external-store contract ───────────────────────────────────────────────
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SessionState => this.state;

  private setState(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // ── reads ─────────────────────────────────────────────────────────────────
  get conversationId(): string {
    return this.state.conversationId;
  }

  get isStreaming(): boolean {
    return this.state.status === "streaming";
  }

  /** Mark history as already-handled so {@link ensureHistory} won't fetch — used for a
   *  freshly minted chat that has nothing persisted yet (avoids a 404 + loading flash). */
  markHistoryLoaded() {
    this.historyLoaded = true;
  }

  // ── behavior ────────────────────────────────────────────────────────────────
  /** Load persisted history once. No-op when already loaded/marked, or while a turn is
   *  streaming (so a live reply is never clobbered by a late fetch). */
  async ensureHistory() {
    if (this.historyLoaded) return;
    this.historyLoaded = true;
    if (this.isStreaming) return;

    this.setState({ status: "loading" });
    try {
      const detail = await chatApi.getConversation(this.state.conversationId);
      if (this.isStreaming) return; // a turn started mid-fetch
      const messages: Message[] = detail.messages.map((m) => ({
        id: m.id,
        role: m.role as Role,
        content: m.content,
        thinking: m.thinking ?? undefined,
        status: "complete" as const,
        createdAt: Date.parse(m.created_at),
      }));
      this.setState({ messages, status: "idle" });
    } catch {
      this.setState({ status: "idle" }); // empty → the page shows the greeting
    }
  }

  /** Send one user turn and stream the assistant reply into this session. */
  async runTurn(args: RunTurnArgs, hooks: RunTurnHooks = {}) {
    if (this.state.status === "streaming") return;
    const id = this.state.conversationId;
    const isFirst = this.state.messages.length === 0;

    const requestMessages = [
      ...this.state.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as Role, content: args.content },
    ];

    const userMessage = createMessage("user", args.content, "complete");
    const assistantMessage = createMessage("assistant", "", "streaming");
    this.setState({
      messages: [...this.state.messages, userMessage, assistantMessage],
      status: "streaming",
    });
    hooks.onTurnStart?.(id, isFirst);

    const controller = new AbortController();
    this.controller = controller;
    try {
      for await (const chunk of chatApi.stream(
        {
          messages: requestMessages,
          max_tokens: MAX_TOKENS,
          enable_thinking: args.enableThinking,
          ...(args.model ? { model: args.model } : {}),
          conversation_id: id,
        },
        controller.signal
      )) {
        if (chunk.error) throw new Error(chunk.error);

        if (chunk.type === "thinking" && chunk.chunk) {
          this.setState({ messages: appendToLastMessage(this.state.messages, { thinking: chunk.chunk }) });
        } else if (chunk.chunk) {
          this.setState({ messages: appendToLastMessage(this.state.messages, { content: chunk.chunk }) });
        }
      }

      this.setState({
        messages: updateLastMessage(this.state.messages, { status: "complete" }),
        status: "idle",
      });
      hooks.onComplete?.(id, isFirst);
    } catch (err) {
      const aborted = (err as Error).name === "AbortError";
      this.setState({
        messages: updateLastMessage(this.state.messages, { status: aborted ? "complete" : "error" }),
        status: aborted ? "idle" : "error",
      });
    } finally {
      if (this.controller === controller) this.controller = null;
    }
  }

  /** Abort the in-flight reply (no-op if idle). */
  stop() {
    this.controller?.abort();
  }
}
