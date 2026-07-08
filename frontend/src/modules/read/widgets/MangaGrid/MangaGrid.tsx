import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useReadLibrary } from "../../entities";
import { useSignedUrls } from "../../shared";
import { MangaCard } from "./components/MangaCard";

/** The library grid — every series, newest activity first (backend order). */
export function MangaGrid() {
  const { mangas, loading, error } = useReadLibrary();
  const coverUrls = useSignedUrls(mangas.map((m) => m.coverPath));

  if (error) {
    return <p className="py-8 text-center text-sm text-[var(--owl-brown-muted)]">Couldn't load your library.</p>;
  }
  if (loading && mangas.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--owl-brown-muted)]">Loading…</p>;
  }
  if (mangas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <img src={owlMascot} alt="" aria-hidden="true" className="w-28 opacity-80" />
        <p className="text-sm text-[var(--owl-brown-muted)]">
          The shelves are empty — create your first manga to start the collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
      {mangas.map((manga) => (
        <MangaCard
          key={manga.id}
          manga={manga}
          coverUrl={manga.coverPath ? coverUrls[manga.coverPath] : undefined}
        />
      ))}
    </div>
  );
}
