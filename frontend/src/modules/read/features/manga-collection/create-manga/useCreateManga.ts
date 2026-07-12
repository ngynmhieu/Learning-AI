import { useCallback, useState } from "react";
import { useMangaCollection } from "../../../entities";
import type { Manga } from "../../../entities";

/** Create a series: persists via the collection provider (which prepends it to
 *  the grid) and hands the new manga back for navigation. */
export function useCreateManga() {
  const { create } = useMangaCollection();
  const [creating, setCreating] = useState(false);

  const createManga = useCallback(
    async (title: string, description?: string | null): Promise<Manga | null> => {
      const trimmed = title.trim();
      if (!trimmed) return null;
      setCreating(true);
      try {
        return await create(trimmed, description);
      } finally {
        setCreating(false);
      }
    },
    [create]
  );

  return { createManga, creating };
}
