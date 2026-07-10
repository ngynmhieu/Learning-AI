import { useCallback, useState } from "react";
import { uploadToBucket } from "@/shared/lib";
import { useSession } from "@/modules/auth";
import { readApi, readImageSize, fileExtension, type ImportStatus } from "../../shared";
import type { Page } from "../../entities";

/** Local upload — the defining direct-to-storage flow: each file goes straight
 *  from the browser to the `manga` bucket (RLS lets the user write only under
 *  their own prefix), then one backend call records the ordered metadata rows.
 *  No image bytes pass through the backend. Positions are computed client-side
 *  from `startPosition` + array index (no server-side count to race on), so
 *  this stays a simple sequential loop — no concurrency needed for safety. */
export function useUploadPages(mangaId: string, sectionId: string) {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, ImportStatus>>({});

  const uploadPages = useCallback(
    async (items: { id: string; file: File }[], startPosition: number): Promise<Page[]> => {
      if (!user || items.length === 0) return [];
      setUploading(true);
      try {
        const records = [];
        for (const [index, { id, file }] of items.entries()) {
          setUploadStatus((prev) => ({ ...prev, [id]: "importing" }));
          const position = startPosition + index;
          const path = `${user.id}/${mangaId}/${sectionId}/${position}-${crypto.randomUUID()}${fileExtension(file)}`;
          const size = await readImageSize(file);
          await uploadToBucket(path, file);
          records.push({ storagePath: path, position, width: size?.width, height: size?.height });
          setUploadStatus((prev) => ({ ...prev, [id]: "done" }));
        }
        return await readApi.recordPages(sectionId, records);
      } finally {
        setUploading(false);
        setUploadStatus({});
      }
    },
    [user, mangaId, sectionId]
  );

  return { uploadPages, uploading, uploadStatus };
}
