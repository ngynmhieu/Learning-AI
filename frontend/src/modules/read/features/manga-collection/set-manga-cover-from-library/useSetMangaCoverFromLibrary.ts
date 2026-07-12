import { useCallback, useState } from "react";
import { useMangaCollection } from "../../../entities";
import { readApi } from "../../../shared";

/** Set a manga's cover to an existing library asset — the cover/from-library
 *  route (not `updateManga`) points `cover_path` at the asset's object and
 *  removes it from the library in one step, so the local collection state is
 *  merged straight from that response via `applyUpdate`, not re-PATCHed
 *  through `update`. */
export function useSetMangaCoverFromLibrary(mangaId: string) {
  const { applyUpdate } = useMangaCollection();
  const [setting, setSetting] = useState(false);

  const setCoverFromLibrary = useCallback(
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

  return { setCoverFromLibrary, setting };
}
