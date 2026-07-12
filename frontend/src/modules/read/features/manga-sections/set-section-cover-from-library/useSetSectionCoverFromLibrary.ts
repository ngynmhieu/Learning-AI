import { useCallback, useState } from "react";
import { readApi } from "../../../shared";

/** Set a section's cover to an existing library asset. Unlike mangas, sections
 *  have no shared context — the caller reflects the change with its own existing
 *  refresh (e.g. `SectionCard`'s `onCoverChanged`), same as the manual-upload path. */
export function useSetSectionCoverFromLibrary(sectionId: string) {
  const [setting, setSetting] = useState(false);

  const setCoverFromLibrary = useCallback(
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

  return { setCoverFromLibrary, setting };
}
