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
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => navigate(`/lector/manga/${manga.id}`)}
        className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream-mid)]/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-10px_rgba(46,26,14,0.25)] cursor-pointer"
      >
        {coverUrl ? (
          <img src={coverUrl} alt={manga.title} loading="lazy" className="size-full object-cover" />
        ) : (
          // The reading owl stands in for series without a cover yet.
          <img src={owlMascot} alt="" aria-hidden="true" className="w-1/2 opacity-70" />
        )}
      </button>
      <p className="truncate text-sm text-[var(--owl-brown-deep)]" title={manga.title}>
        {manga.title}
      </p>
    </div>
  );
}
