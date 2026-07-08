import { useCallback, useState } from "react";
import { uploadToBucket } from "@/shared/lib";
import { useSession } from "@/modules/auth";
import { readApi, readImageSize, fileExtension } from "../../shared";
import type { LibraryAsset } from "../../entities";

/** Fill the pool — both collect flows land in `{user_id}/_pool/` with no manga
 *  attached: scrape candidates go through the backend (server-side download),
 *  local files go direct-to-storage then get recorded. Organizing them into a
 *  section is a separate, later action (organize-from-pool). */
export function useCollectToPool() {
  const { user } = useSession();
  const [collecting, setCollecting] = useState(false);

  const importUrlsToPool = useCallback(
    async (urls: string[], referer?: string): Promise<LibraryAsset[]> => {
      if (urls.length === 0) return [];
      setCollecting(true);
      try {
        return await readApi.importToLibrary(urls, referer);
      } finally {
        setCollecting(false);
      }
    },
    []
  );

  const uploadFilesToPool = useCallback(
    async (files: File[]): Promise<LibraryAsset[]> => {
      if (!user || files.length === 0) return [];
      setCollecting(true);
      try {
        const records = [];
        for (const file of files) {
          const path = `${user.id}/_pool/${crypto.randomUUID()}${fileExtension(file)}`;
          const size = await readImageSize(file);
          await uploadToBucket(path, file);
          records.push({ storagePath: path, width: size?.width, height: size?.height });
        }
        return await readApi.recordLibraryAssets(records);
      } finally {
        setCollecting(false);
      }
    },
    [user]
  );

  return { importUrlsToPool, uploadFilesToPool, collecting };
}
