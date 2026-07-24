import { useCallback, useEffect, useState } from "react";
import { readApi } from "../../../shared";
import type { MangaDetail } from "../manga.types";

/** One manga's detail (title/description + its sections) — the page's initial
 *  fetch, plus a `refresh` the caller invokes after create/delete-section
 *  actions change the set. Mirrors `useMangaCollection`'s shape at the single-item
 *  level instead of the collection level. */
export function useMangaDetail(mangaId: string | undefined) {
  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!mangaId) return;
    try {
      setDetail(await readApi.getManga(mangaId));
    } catch {
      setNotFound(true);
    }
  }, [mangaId]);

  // Initial load — no synchronous setState in the effect body.
  useEffect(() => {
    if (!mangaId) return;
    let cancelled = false;
    readApi
      .getManga(mangaId)
      .then((loaded) => {
        if (!cancelled) setDetail(loaded);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mangaId]);

  return { detail, notFound, refresh };
}
