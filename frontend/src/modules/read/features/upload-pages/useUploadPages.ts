import { useCallback, useState } from "react";
import { uploadToBucket } from "@/shared/lib";
import { useSession } from "@/modules/auth";
import { readApi, readImageSize, fileExtension } from "../../shared";
import type { Page } from "../../entities";

/** Local upload — the defining direct-to-storage flow: each file goes straight
 *  from the browser to the `manga` bucket (RLS lets the user write only under
 *  their own prefix), then one backend call records the ordered metadata rows.
 *  No image bytes pass through the backend. */
export function useUploadPages(mangaId: string, sectionId: string) {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  /** 0-based index of the file currently uploading, for progress display. */
  const [progress, setProgress] = useState<number | null>(null);

  const uploadPages = useCallback(
    async (files: File[], startPosition: number): Promise<Page[]> => {
      if (!user || files.length === 0) return [];
      setUploading(true);
      try {
        const records = [];
        for (const [index, file] of files.entries()) {
          setProgress(index);
          const position = startPosition + index;
          const path = `${user.id}/${mangaId}/${sectionId}/${position}-${crypto.randomUUID()}${fileExtension(file)}`;
          const size = await readImageSize(file);
          await uploadToBucket(path, file);
          records.push({ storagePath: path, position, width: size?.width, height: size?.height });
        }
        return await readApi.recordPages(sectionId, records);
      } finally {
        setUploading(false);
        setProgress(null);
      }
    },
    [user, mangaId, sectionId]
  );

  return { uploadPages, uploading, progress };
}
