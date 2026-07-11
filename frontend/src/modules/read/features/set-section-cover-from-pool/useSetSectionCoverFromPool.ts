import { useCallback, useState } from "react";
import { readApi } from "../../shared";

/** Set a section's cover to an existing pool asset. Unlike mangas, sections have
 *  no shared context — the caller reflects the change with its own existing
 *  refresh (e.g. `SectionCard`'s `onCoverChanged`), same as the manual-upload path. */
export function useSetSectionCoverFromPool(sectionId: string) {
  const [setting, setSetting] = useState(false);

  const setCoverFromPool = useCallback(
    async (assetId: string) => {
      setSetting(true);
      try {
        await readApi.setSectionCoverFromLibrary(sectionId, assetId);
      } finally {
        setSetting(false);
      }
    },
    [sectionId]
  );

  return { setCoverFromPool, setting };
}
