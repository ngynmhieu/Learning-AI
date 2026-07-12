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

  /** Add one just-collected asset, sorted into place by `position` — collect
   *  now streams items in *completion* order (see `useCollectToLibrary`), not
   *  the batch's original order, so a plain push would visually scramble the
   *  very ordering `position` exists to guarantee. */
  const appendAsset = useCallback((next: LibraryAsset) => {
    setAssets((prev) => [...prev, next].sort((a, b) => a.position - b.position));
  }, []);

  /** Drop assets that were inserted into a section or discarded. */
  const removeAssets = useCallback((ids: string[]) => {
    const gone = new Set(ids);
    setAssets((prev) => prev.filter((asset) => !gone.has(asset.id)));
  }, []);

  return { assets, loading, error, refresh, appendAsset, removeAssets };
}
