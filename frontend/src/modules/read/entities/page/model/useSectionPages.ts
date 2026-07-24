import { useCallback, useEffect, useState } from "react";
import { readApi } from "../../../shared";
import type { Page } from "../page.types";

/** A section's pages, in reading order — the reader's initial fetch, plus a
 *  `refresh` the reader calls after adding pages in its own edit mode, so new
 *  pages appear without navigating away. */
export function useSectionPages(sectionId: string | undefined) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sectionId) return;
    try {
      setPages(await readApi.listPages(sectionId));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [sectionId]);

  // Initial load — no synchronous setState in the effect body.
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

  return { pages, error, refresh };
}
