import { useCallback, useState } from "react";
import { readApi } from "../../shared";
import type { Page } from "../../entities";

/** Import chosen scrape candidates straight into a section — the backend
 *  downloads them server-side (browsers can't fetch cross-origin/hotlink-
 *  protected images), uploads to Storage, and records the ordered rows. */
export function useImportPages(sectionId: string) {
  const [importing, setImporting] = useState(false);

  const importPages = useCallback(
    async (urls: string[], referer?: string): Promise<Page[]> => {
      if (urls.length === 0) return [];
      setImporting(true);
      try {
        return await readApi.importInto(sectionId, urls, referer);
      } finally {
        setImporting(false);
      }
    },
    [sectionId]
  );

  return { importPages, importing };
}
