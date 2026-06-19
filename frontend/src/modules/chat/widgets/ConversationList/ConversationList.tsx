import { useNavigate, useParams } from "react-router";
import { Plus } from "lucide-react";
import { useConversations } from "../../entities";
import { ConversationItem } from "./components/ConversationItem";

/** Sidebar history list: a "New chat" action + the user's conversations. */
export function ConversationList() {
  const { conversations, loading, error } = useConversations();
  const { conversationId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="mt-3 flex flex-col min-h-0">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 mx-2 px-[0.3rem] py-1 rounded-sm text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/15 hover:backdrop-blur-sm transition-colors cursor-pointer"
      >
        <Plus size={16} className="shrink-0" />
        <span className="truncate">New chat</span>
      </button>

      <div className="mt-1 px-2 text-[0.65rem] uppercase tracking-wide text-[var(--owl-brown-muted)]">
        History
      </div>

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
    </div>
  );
}
