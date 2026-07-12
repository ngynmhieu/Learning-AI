import { useCallback, useState } from "react";
import { readApi, type ImportStatus } from "../../../shared";
import type { Page } from "../../../entities";

/** Library → section, in one backend call — unlike scrape/upload, `organizeFromLibrary`
 *  positions and inserts every page in one transaction (no per-item count to race
 *  on), so this stays a single batched request instead of a sequential loop. */
export function useOrganizeFromLibrary(sectionId: string) {
  const [organizing, setOrganizing] = useState(false);
  const [organizeStatus, setOrganizeStatus] = useState<Record<string, ImportStatus>>({});

  const organize = useCallback(
    async (assetIds: string[]): Promise<Page[]> => {
      if (assetIds.length === 0) return [];
      setOrganizing(true);
      setOrganizeStatus(Object.fromEntries(assetIds.map((id) => [id, "importing"])));
      try {
        return await readApi.organizeFromLibrary(sectionId, assetIds);
      } finally {
        setOrganizing(false);
        setOrganizeStatus({});
      }
    },
    [sectionId]
  );

  return { organize, organizing, organizeStatus };
}
