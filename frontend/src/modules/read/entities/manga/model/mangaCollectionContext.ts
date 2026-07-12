import { createContext } from "react";
import type { Manga } from "../manga.types";

export interface MangaCollectionContextValue {
  mangas: Manga[];
  loading: boolean;
  error: string | null;
  /** Re-fetch the manga collection from the backend. */
  refresh: () => Promise<void>;
  /** Create a series on the backend, prepend it locally, and return it. */
  create: (title: string, description?: string | null) => Promise<Manga>;
  /** Persist a rename/description/cover change, then update locally. */
  update: (
    id: string,
    patch: { title?: string; description?: string | null; coverPath?: string | null }
  ) => Promise<void>;
  /** Merge an already-fetched `Manga` into local state — for callers that hit a
   *  different endpoint than `updateManga` (e.g. `useSetMangaCoverFromLibrary`, which
   *  calls the cover/from-library route) but still want the same instant local
   *  reflection `update` gives, without firing a second, redundant PATCH. */
  applyUpdate: (manga: Manga) => void;
  /** Delete on the backend (rows + Storage files), then drop it locally. */
  remove: (id: string) => Promise<void>;
}

export const MangaCollectionContext = createContext<MangaCollectionContextValue | null>(null);
