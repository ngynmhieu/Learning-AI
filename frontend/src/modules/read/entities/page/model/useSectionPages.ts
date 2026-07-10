import { useEffect, useState } from "react";
import { readApi } from "../../../shared";
import type { Page } from "../page.types";

/** A section's pages, in reading order — the reader's initial fetch, and also
 *  what the add-pages panel uses just for the current count. */
export function useSectionPages(sectionId: string | undefined) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;
    readApi
      .listPages(sectionId)
      .then((list) => {
        if (!cancelled) setPages(list);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  return { pages, error };
}
