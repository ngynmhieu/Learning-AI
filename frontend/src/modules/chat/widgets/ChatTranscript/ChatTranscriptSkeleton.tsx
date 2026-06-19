/** Placeholder shown while a conversation's history is being fetched (status "loading").
 *  Mirrors ChatTranscript's layout — alternating user/assistant rows — so the real
 *  messages slot in without a layout shift once they arrive. Purely presentational. */

/** A single pulsing placeholder bar. */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`h-3.5 rounded-full bg-[var(--owl-tan)]/20 ${className}`} />;
}

/** One skeleton message row. Assistant rows carry an avatar placeholder + a bordered
 *  bubble (multi-line); user rows are a solid right-aligned bubble. */
function SkeletonRow({ role, lines, delay }: { role: "user" | "assistant"; lines: string[]; delay: number }) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-end gap-2.5 animate-pulse ${isUser ? "justify-end" : "justify-start"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {!isUser && (
        <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--owl-tan)]/20" />
      )}
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 shadow-sm
          ${isUser
            ? "bg-[var(--owl-brown)]/15 rounded-br-sm"
            : "bg-white/40 border border-[var(--owl-border)]/60 rounded-bl-sm"
          }
        `}
      >
        <div className="flex flex-col gap-2 py-0.5">
          {lines.map((width, i) => (
            <Bar key={i} className={width} />
          ))}
        </div>
      </div>
    </div>
  );
}

// A fixed, plausible-looking transcript shape: short prompts, longer replies.
const ROWS = [
  { role: "user" as const, lines: ["w-32"] },
  { role: "assistant" as const, lines: ["w-64", "w-56", "w-40"] },
  { role: "user" as const, lines: ["w-24"] },
  { role: "assistant" as const, lines: ["w-60", "w-64", "w-48", "w-32"] },
];

export function ChatTranscriptSkeleton() {
  return (
    <div className="absolute inset-0" aria-busy="true" aria-label="Loading conversation">
      <div className="h-full overflow-y-auto py-6 pb-40 [scrollbar-gutter:stable_both-edges]">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
          {ROWS.map((row, i) => (
            <SkeletonRow key={i} role={row.role} lines={row.lines} delay={i * 120} />
          ))}
        </div>
      </div>
    </div>
  );
}
