import { useNavigate } from "react-router";
import { Layers } from "lucide-react";
import { LoadingDialog } from "@/shared/ui";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useReadLibrary } from "../entities";
import { MangaGrid } from "../widgets";

/** /lector — the library: mascot + blurb and the pool link on top, the manga
 *  grid below (empty state shows a single centered "add manga" tile). */
export function LectorLibraryPage() {
  const navigate = useNavigate();
  const { mangas, loading, error } = useReadLibrary();

  // Initial load — show only the mascot dialog, nothing else on the page yet.
  if (loading && mangas.length === 0) {
    return <LoadingDialog fullScreen={false} message="Fetching your library…" />;
  }
  if (error) {
    return <p className="py-12 text-center text-sm text-[var(--owl-brown-muted)]">Couldn't load your library.</p>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 flex flex-col gap-6">
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

        <MangaGrid />
      </div>
    </div>
  );
}
