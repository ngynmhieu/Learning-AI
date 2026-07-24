import { useNavigate } from "react-router";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useMangaCollection } from "../../../entities";
import { useSignedUrls, TileGrid } from "../../../shared";
import { useCreateManga } from "../../../features";
import { MangaCard } from "./components/MangaCard";
import { AddMangaCard } from "./components/AddMangaCard";

interface MangaGridProps {
  /** View mode is read-only (just the covers); edit mode adds the "new manga"
   *  tile and a per-card hover button to replace its cover. */
  editing: boolean;
}

/** The collection grid — every series, newest activity first (backend order).
 *  Loading/error states are handled a level up, by MangaCollectionPage, before
 *  this widget ever mounts. */
export function MangaGrid({ editing }: MangaGridProps) {
  const navigate = useNavigate();
  const { mangas } = useMangaCollection();
  const { createManga, creating } = useCreateManga();
  const coverUrls = useSignedUrls(mangas.map((m) => m.coverPath));

  const create = async (title: string) => {
    const manga = await createManga(title);
    if (manga) navigate(`/lector/manga/${manga.id}`);
  };

  return (
    <TileGrid
      count={mangas.length}
      editing={editing}
      addTile={<AddMangaCard onCreate={create} creating={creating} />}
      emptyMessage="No manga in your library yet."
      emptyIcon={<img src={owlMascot} alt="" aria-hidden="true" className="w-16 opacity-70" />}
    >
      {mangas.map((manga) => (
        <MangaCard
          key={manga.id}
          manga={manga}
          coverUrl={manga.coverPath ? coverUrls[manga.coverPath] : undefined}
          editing={editing}
        />
      ))}
    </TileGrid>
  );
}
