import { useCallback, useState } from "react";
import { readApi } from "../../shared";

/** Remove a volume/chapter (and its pages); the caller refreshes its manga's
 *  detail view after. Sibling to `useCreateSection`. */
export function useDeleteSection() {
  const [deleting, setDeleting] = useState(false);

  const deleteSection = useCallback(async (sectionId: string): Promise<void> => {
    setDeleting(true);
    try {
      await readApi.deleteSection(sectionId);
    } finally {
      setDeleting(false);
    }
  }, []);

  return { deleteSection, deleting };
}
