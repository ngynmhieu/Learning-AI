import { useCallback, useState } from "react";
import { readApi } from "../../../shared";

/** Persist a drag-reorder: position is rewritten to each page id's index in the
 *  given list (the backend does it in one transaction). */
export function useReorderPages(sectionId: string) {
  const [reordering, setReordering] = useState(false);

  const reorder = useCallback(
    async (orderedPageIds: string[]): Promise<void> => {
      if (orderedPageIds.length === 0) return;
      setReordering(true);
      try {
        await readApi.reorderPages(sectionId, orderedPageIds);
      } finally {
        setReordering(false);
      }
    },
    [sectionId]
  );

  return { reorder, reordering };
}
