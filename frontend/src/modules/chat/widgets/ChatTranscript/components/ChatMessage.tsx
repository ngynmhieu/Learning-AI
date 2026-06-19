import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Message } from "../../../entities";
import { MarkdownRenderer } from "@/shared/ui";
import { useStreamBuffer } from "@/modules/chat/shared";
import owlAvatar from "@/shared/assets/owl_teaching_with_glasses.png";

interface ChatMessageProps {
  message: Message;
}

/** Three bouncing dots shown while the backend is processing but nothing has streamed yet. */
function ProcessingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-[var(--owl-tan-mid)]"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** Animated owl that gently breathes while the assistant is working. */
function Avatar({ active }: { active: boolean }) {
  return (
    <motion.img
      src={owlAvatar}
      alt="The Docent"
      className="shrink-0 w-9 h-9 object-contain"
      animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={active ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
    />
  );
}

function ThinkingBlock({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
  const [open, setOpen] = useState(isStreaming);

  // Auto-open while thinking streams in; auto-collapse once the answer begins.
  // Adjust during render (not in an effect) so a flip of isStreaming resets `open`
  // while still letting the user toggle it manually in between.
  const [wasStreaming, setWasStreaming] = useState(isStreaming);
  if (wasStreaming !== isStreaming) {
    setWasStreaming(isStreaming);
    setOpen(isStreaming);
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-[var(--owl-brown-dark)]/50 hover:text-[var(--owl-brown-dark)]/75 transition-colors"
      >
        <motion.svg
          className="w-3.5 h-3.5 shrink-0"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </motion.svg>
        {isStreaming ? (
          <span className="font-medium bg-gradient-to-r from-[var(--owl-brown-dark)]/40 via-[var(--owl-orange)] to-[var(--owl-brown-dark)]/40 bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]">
            Thinking…
          </span>
        ) : (
          <span className="font-medium">Thought process</span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 pl-3 border-l-2 border-[var(--owl-tan)]/50 text-xs text-[var(--owl-brown-dark)]/60 leading-relaxed break-words prose-sm">
              <MarkdownRenderer content={thinking} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";
  const displayedContent = useStreamBuffer(message.content);

  // Nothing has come back yet — show the processing animation.
  const isWaiting = isStreaming && !message.thinking && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && <Avatar active={isStreaming} />}

      <motion.div
        whileHover={{ y: -1 }}
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-shadow hover:shadow-md
          ${isUser
            ? "bg-[var(--owl-brown)] text-[var(--owl-cream)] rounded-br-sm"
            : isError
              ? "bg-red-100/80 text-red-800 rounded-bl-sm border border-red-200"
              : "bg-white/60 backdrop-blur-sm text-[var(--owl-brown-dark)] rounded-bl-sm border border-[var(--owl-border)]"
          }
        `}
      >
        {isUser || isError ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            {message.thinking && (
              <ThinkingBlock thinking={message.thinking} isStreaming={isStreaming} />
            )}
            {isWaiting ? (
              <ProcessingIndicator />
            ) : (
              <div className="prose-sm">
                <MarkdownRenderer content={displayedContent} />
              </div>
            )}
          </>
        )}
        {isError && (
          <p className="text-xs mt-1 opacity-60">Something went wrong. Please try again.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
