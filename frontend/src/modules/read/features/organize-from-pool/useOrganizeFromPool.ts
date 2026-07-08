import { useCallback, useState } from "react";
import { readApi } from "../../shared";
import type { Page } from "../../entities";

/** Drain the pool into a section: each chosen asset becomes a page (the backend
 *  reuses the same Storage object — no re-upload) and leaves the pool, in one
 *  transaction. The given order becomes the page order. */
export function useOrganizeFromPool() {
  const [organizing, setOrganizing] = useState(false);

  const organize = useCallback(
    async (sectionId: string, orderedAssetIds: string[]): Promise<Page[]> => {
      if (orderedAssetIds.length === 0) return [];
      setOrganizing(true);
      try {
        return await readApi.organizeFromLibrary(sectionId, orderedAssetIds);
      } finally {
        setOrganizing(false);
      }
    },
    []
  );

  return { organize, organizing };
}
