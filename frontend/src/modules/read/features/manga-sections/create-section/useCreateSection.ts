import { useCallback, useState } from "react";
import { readApi, type SectionCreateInput } from "../../../shared";
import type { Section } from "../../../entities";

/** Add a volume/chapter to a manga; the caller refreshes its detail view after. */
export function useCreateSection() {
  const [creating, setCreating] = useState(false);

  const createSection = useCallback(
    async (mangaId: string, input: SectionCreateInput): Promise<Section> => {
      setCreating(true);
      try {
        return await readApi.createSection(mangaId, input);
      } finally {
        setCreating(false);
      }
    },
    []
  );

  return { createSection, creating };
}
