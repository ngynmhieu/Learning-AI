import { useNavigate } from "react-router";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import type { Manga } from "../../../entities";

interface MangaCardProps {
  manga: Manga;
  /** Signed cover URL, when the manga has a cover and signing succeeded. */
  coverUrl?: string;
}

export function MangaCard({ manga, coverUrl }: MangaCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/lector/manga/${manga.id}`)}
      className="group flex flex-col text-left rounded-md overflow-hidden border border-[var(--owl-border)] bg-[var(--owl-cream)]/40 hover:shadow-[var(--shadow)] hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-[var(--owl-cream-mid)]/50 flex items-center justify-center">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={manga.title}
            loading="lazy"
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          // The reading owl stands in for series without a cover yet.
          <img src={owlMascot} alt="" aria-hidden="true" className="w-1/2 opacity-70" />
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-[var(--owl-brown-deep)] truncate" title={manga.title}>
          {manga.title}
        </p>
        {manga.description && (
          <p className="text-xs text-[var(--owl-brown-muted)] truncate">{manga.description}</p>
        )}
      </div>
    </button>
  );
}
