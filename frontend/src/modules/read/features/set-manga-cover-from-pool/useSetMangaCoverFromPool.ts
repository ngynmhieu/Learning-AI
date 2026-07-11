import { useCallback, useState } from "react";
import { useReadLibrary } from "../../entities";
import { readApi } from "../../shared";

/** Set a manga's cover to an existing pool asset — the cover/from-library route
 *  (not `updateManga`) points `cover_path` at the asset's object and removes it
 *  from the pool in one step, so the local library state is merged straight
 *  from that response via `applyUpdate`, not re-PATCHed through `update`. */
export function useSetMangaCoverFromPool(mangaId: string) {
  const { applyUpdate } = useReadLibrary();
  const [setting, setSetting] = useState(false);

  const setCoverFromPool = useCallback(
    async (assetId: string) => {
      setSetting(true);
      try {
        const manga = await readApi.setMangaCoverFromLibrary(mangaId, assetId);
        applyUpdate(manga);
      } finally {
        setSetting(false);
      }
    },
    [mangaId, applyUpdate]
  );

  return { setCoverFromPool, setting };
}
