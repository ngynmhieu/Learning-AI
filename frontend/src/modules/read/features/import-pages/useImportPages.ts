import { useCallback, useState } from "react";
import { readApi, type ImportStatus } from "../../shared";
import type { Page } from "../../entities";

/** Import chosen scrape candidates straight into a section — one URL per
 *  request (not the batch endpoint) so the caller can show per-candidate
 *  progress. Deliberately sequential, not concurrent: the backend assigns
 *  each page's `position` by counting existing pages at request time, and
 *  `(section_id, position)` is unique — concurrent requests into the same
 *  section would race on that count and collide. (The pool has no such
 *  ordering, so `useCollectToPool` can safely run its imports concurrently.) */
export function useImportPages(sectionId: string) {
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});

  const importPages = useCallback(
    async (urls: string[], referer?: string): Promise<Page[]> => {
      if (urls.length === 0) return [];
      setImporting(true);
      try {
        const pages: Page[] = [];
        for (const url of urls) {
          setImportStatus((prev) => ({ ...prev, [url]: "importing" }));
          pages.push(...(await readApi.importInto(sectionId, [url], referer)));
          setImportStatus((prev) => ({ ...prev, [url]: "done" }));
        }
        return pages;
      } finally {
        setImporting(false);
        setImportStatus({});
      }
    },
    [sectionId]
  );

  return { importPages, importing, importStatus };
}
