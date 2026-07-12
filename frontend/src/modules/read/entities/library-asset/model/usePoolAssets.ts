import { useCallback, useEffect, useState } from "react";
import { readApi } from "../../../shared";
import type { LibraryAsset } from "../libraryAsset.types";

/** The pool list (oldest-first, matching the backend order) plus the local
 *  mutations the pool workflows need. Hook rather than context: the pool page
 *  is its only consumer. */
export function usePoolAssets() {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await readApi.listLibrary();
      setAssets(list);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    readApi
      .listLibrary()
      .then((list) => {
        if (cancelled) return;
        setAssets(list);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Replace the trailing `count` assets with `next` — the newest assets land at
   *  the bottom, matching the backend's oldest-first order. Plain appending
   *  (`count: 0`) is the simple case; a growing in-flight collect batch calls this
   *  repeatedly with its always-correctly-ordered "resolved so far" set and the
   *  count it last showed, so each call reveals newly-finished items immediately
   *  (in the right order) without duplicating what's already visible — see
   *  `useCollectToLibrary`. */
  const replaceTail = useCallback((count: number, next: LibraryAsset[]) => {
    setAssets((prev) => [...prev.slice(0, prev.length - count), ...next]);
  }, []);

  /** Drop assets that were organized into a section or discarded. */
  const removeAssets = useCallback((ids: string[]) => {
    const gone = new Set(ids);
    setAssets((prev) => prev.filter((asset) => !gone.has(asset.id)));
  }, []);

  return { assets, loading, error, refresh, replaceTail, removeAssets };
}
