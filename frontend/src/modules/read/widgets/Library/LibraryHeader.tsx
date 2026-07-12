import { useNavigate } from "react-router";
import { ArrowLeft, Pencil, Check } from "lucide-react";

interface LibraryHeaderProps {
  editing: boolean;
  onToggleEditing: () => void;
}

/** Back link + page title + the Edit/Done toggle that reveals selection and
 *  discard in `LibraryStorage`. */
export function LibraryHeader({ editing, onToggleEditing }: LibraryHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-3">
      <button
        onClick={() => navigate("/lector")}
        aria-label="Back to collection"
        className="p-1.5 rounded-md text-[var(--owl-brown-muted)] transition-colors hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)] cursor-pointer"
      >
        <ArrowLeft size={24} />
      </button>
      <h1 className="flex-1 min-w-0 text-xl text-[var(--owl-brown-dark)] truncate">Image pool</h1>
      <button
        onClick={onToggleEditing}
        className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer"
      >
        {editing ? <Check size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
        {editing ? "Done" : "Edit"}
      </button>
    </header>
  );
}
