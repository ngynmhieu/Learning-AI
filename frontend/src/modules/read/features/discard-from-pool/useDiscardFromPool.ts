import { useCallback, useState } from "react";
import { readApi } from "../../shared";

/** Discard one or many pool assets — each id is removed the moment its own
 *  request resolves (not when a whole bulk batch finishes), so the caller can
 *  update its list/selection per asset via `onDiscarded`. Sibling to
 *  `useCollectToPool`. */
export function useDiscardFromPool() {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const discardOne = useCallback(async (assetId: string, onDiscarded?: (assetId: string) => void) => {
    setDeletingIds((prev) => new Set(prev).add(assetId));
    try {
      await readApi.discardLibraryAsset(assetId);
      onDiscarded?.(assetId);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  }, []);

  const discardMany = useCallback(
    (assetIds: string[], onDiscarded?: (assetId: string) => void) => {
      return Promise.all(assetIds.map((id) => discardOne(id, onDiscarded)));
    },
    [discardOne]
  );

  return { discardOne, discardMany, deletingIds };
}
