import { useNavigate } from "react-router";
import { useReadLibrary } from "../../entities";
import { useSignedUrls } from "../../shared";
import { useCreateManga } from "../../features";
import { MangaCard } from "./components/MangaCard";
import { AddMangaCard } from "./components/AddMangaCard";

/** The library grid — every series, newest activity first (backend order),
 *  plus an always-present "add manga" tile: centered alone when the library
 *  is empty, first tile in the grid otherwise. Loading/error states are
 *  handled a level up, by LectorLibraryPage, before this widget ever mounts. */
export function MangaGrid() {
  const navigate = useNavigate();
  const { mangas } = useReadLibrary();
  const { createManga, creating } = useCreateManga();
  const coverUrls = useSignedUrls(mangas.map((m) => m.coverPath));

  const create = async (title: string) => {
    const manga = await createManga(title);
    if (manga) navigate(`/lector/manga/${manga.id}`);
  };

  if (mangas.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-40">
          <AddMangaCard onCreate={create} creating={creating} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
      <AddMangaCard onCreate={create} creating={creating} />
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
