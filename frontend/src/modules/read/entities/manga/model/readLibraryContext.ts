import { createContext } from "react";
import type { Manga } from "../manga.types";

export interface ReadLibraryContextValue {
  mangas: Manga[];
  loading: boolean;
  error: string | null;
  /** Re-fetch the library list from the backend. */
  refresh: () => Promise<void>;
  /** Create a series on the backend, prepend it locally, and return it. */
  create: (title: string, description?: string | null) => Promise<Manga>;
  /** Persist a rename/description/cover change, then update locally. */
  update: (
    id: string,
    patch: { title?: string; description?: string | null; coverPath?: string | null }
  ) => Promise<void>;
  /** Delete on the backend (rows + Storage files), then drop it locally. */
  remove: (id: string) => Promise<void>;
}

export const ReadLibraryContext = createContext<ReadLibraryContextValue | null>(null);
