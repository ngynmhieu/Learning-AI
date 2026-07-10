import { useCallback, useState } from "react";
import { uploadToBucket } from "@/shared/lib";
import { useSession } from "@/modules/auth";
import { fileExtension } from "../../shared";
import { useReadLibrary } from "../../entities";

/** Replace a manga's cover — direct-to-storage upload (same idiom as page
 *  uploads), then a single PATCH to point `coverPath` at the new file. */
export function useUploadCover(mangaId: string) {
  const { user } = useSession();
  const { update } = useReadLibrary();
  const [uploading, setUploading] = useState(false);

  const uploadCover = useCallback(
    async (file: File) => {
      if (!user) return;
      setUploading(true);
      try {
        const path = `${user.id}/${mangaId}/cover-${crypto.randomUUID()}${fileExtension(file)}`;
        await uploadToBucket(path, file);
        await update(mangaId, { coverPath: path });
      } finally {
        setUploading(false);
      }
    },
    [user, mangaId, update]
  );

  return { uploadCover, uploading };
}
