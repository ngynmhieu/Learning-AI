import { useState } from "react";
import { useParams } from "react-router";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useConversations } from "../../entities";
import { ConversationItem } from "./components/ConversationItem";

/** Sidebar history list — an accordion (open by default) over the user's conversations.
 *  No "new chat" action here: the "The Docent" nav item above already opens one. */
export function ConversationList() {
  const { conversations, loading, error } = useConversations();
  const { conversationId } = useParams();
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-3 flex flex-col min-h-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between mx-2 px-[0.3rem] py-1 rounded-sm text-[0.65rem] uppercase tracking-wide text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-dark)] transition-colors cursor-pointer"
      >
        History
        <motion.span
          className="flex shrink-0"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={12} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="history-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden flex-1 min-h-0 flex flex-col"
          >
            <div className="mt-1 flex-1 overflow-y-auto overflow-x-hidden">
              {error ? (
                <p className="px-3 py-1 text-xs text-[var(--owl-brown-muted)]">Couldn't load history.</p>
              ) : loading && conversations.length === 0 ? (
                <p className="px-3 py-1 text-xs text-[var(--owl-brown-muted)]">Loading…</p>
              ) : conversations.length === 0 ? (
                <p className="px-3 py-1 text-xs text-[var(--owl-brown-muted)]">No conversations yet.</p>
              ) : (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === conversationId}
                    isCurrent={conversation.id === conversationId}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
