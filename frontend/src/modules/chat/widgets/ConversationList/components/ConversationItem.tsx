import { useState } from "react";
import { useNavigate } from "react-router";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useConversations, type Conversation } from "../../../entities";

interface ConversationItemProps {
  conversation: Conversation;
  active: boolean;
  /** True when this is the conversation currently open in the route. */
  isCurrent: boolean;
}

export function ConversationItem({ conversation, active, isCurrent }: ConversationItemProps) {
  const { rename, remove } = useConversations();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  const cancel = () => {
    setEditing(false);
    setDraft(conversation.title);
  };

  const save = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== conversation.title) await rename(conversation.id, next);
    else setDraft(conversation.title);
  };

  const onDelete = async () => {
    await remove(conversation.id);
    if (isCurrent) navigate("/");
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mx-2 px-[0.3rem] py-1 rounded-sm bg-[var(--owl-brown)]/10">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          className="flex-1 min-w-0 bg-transparent text-sm text-[var(--owl-brown-deep)] outline-none"
        />
        <button onMouseDown={(e) => e.preventDefault()} onClick={save} aria-label="Save" className="shrink-0 text-[var(--owl-brown)] hover:text-[var(--owl-brown-deep)] cursor-pointer">
          <Check size={14} />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={cancel} aria-label="Cancel" className="shrink-0 text-[var(--owl-brown)] hover:text-[var(--owl-brown-deep)] cursor-pointer">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 mx-2 px-[0.3rem] py-1 rounded-sm text-sm transition-colors ${
        active
          ? "bg-[var(--owl-brown)]/10 text-[var(--owl-brown-deep)] font-medium backdrop-blur-sm"
          : "text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/15 hover:backdrop-blur-sm"
      }`}
    >
      <button
        onClick={() => navigate(`/c/${conversation.id}`)}
        className="flex-1 min-w-0 text-left truncate whitespace-nowrap cursor-pointer"
        title={conversation.title}
      >
        {conversation.title}
      </button>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setDraft(conversation.title);
            setEditing(true);
          }}
          aria-label="Rename conversation"
          className="p-0.5 rounded text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)] cursor-pointer"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete conversation"
          className="p-0.5 rounded text-[var(--owl-brown-muted)] hover:text-red-600 cursor-pointer"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
