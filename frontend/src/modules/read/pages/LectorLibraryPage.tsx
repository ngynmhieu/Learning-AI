import { useState } from "react";
import { useNavigate } from "react-router";
import { Layers, Plus } from "lucide-react";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useCreateManga } from "../features";
import { MangaGrid } from "../widgets";

/** /lector — the library: every series as a cover grid, plus create + pool links. */
export function LectorLibraryPage() {
  const navigate = useNavigate();
  const { createManga, creating } = useCreateManga();
  const [title, setTitle] = useState("");

  const create = async () => {
    const manga = await createManga(title);
    if (manga) {
      setTitle("");
      navigate(`/lector/manga/${manga.id}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <img src={owlMascot} alt="" aria-hidden="true" className="w-10" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl text-[var(--owl-brown-dark)]">Lector</h1>
            <p className="text-sm text-[var(--owl-brown-muted)]">Your manga library.</p>
          </div>
          <button
            onClick={() => navigate("/lector/pool")}
            className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer"
          >
            <Layers size={15} aria-hidden="true" />
            Image pool
          </button>
        </header>

        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="New manga title…"
            className="flex-1 min-w-0 max-w-md rounded-md border border-[var(--owl-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
          />
          <button
            onClick={create}
            disabled={creating || !title.trim()}
            className="flex items-center gap-1.5 rounded-md bg-[var(--owl-brown)] px-3 py-1.5 text-sm text-[var(--owl-cream)] hover:bg-[var(--owl-brown-deep)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} aria-hidden="true" />
            {creating ? "Creating…" : "Create"}
          </button>
        </div>

        <MangaGrid />
      </div>
    </div>
  );
}
