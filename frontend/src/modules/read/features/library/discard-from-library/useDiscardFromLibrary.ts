import { useCallback, useState } from "react";
import { readApi } from "../../../shared";

/** Discard one or many library assets — each id is removed the moment its own
 *  request resolves (not when a whole bulk batch finishes), so the caller can
 *  update its list/selection per asset via `onDiscarded`. Sibling to
 *  `useCollectToLibrary`. */
export function useDiscardFromLibrary() {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const discardImage = useCallback(async (assetId: string, onDiscarded?: (assetId: string) => void) => {
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

  const discardImages = useCallback(
    (assetIds: string[], onDiscarded?: (assetId: string) => void) => {
      return Promise.all(assetIds.map((id) => discardImage(id, onDiscarded)));
    },
    [discardImage]
  );

  return { discardImage, discardImages, deletingIds };
}
