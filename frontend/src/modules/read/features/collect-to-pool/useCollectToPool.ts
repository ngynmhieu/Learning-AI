import { useCallback, useState } from "react";
import { uploadToBucket, mapWithConcurrency } from "@/shared/lib";
import { useSession } from "@/modules/auth";
import { readApi, readImageSize, fileExtension, type ImportStatus } from "../../shared";
import type { LibraryAsset } from "../../entities";

/** Matches the backend's own download concurrency (see ScrapeService). */
const CONCURRENCY = 5;

/** Fill the pool — both collect flows land in `{user_id}/_pool/` with no manga
 *  attached: scrape candidates go through the backend (server-side download),
 *  local files go direct-to-storage then get recorded. Organizing them into a
 *  section is a separate, later action (organize-from-pool). Both flows run
 *  with bounded concurrency and record each item as it finishes (rather than
 *  batching one insert at the end) so the caller can hand it to the pool grid
 *  immediately via `onItemDone` — N requests/DB rows instead of 1 batched
 *  call, traded for that real-time feedback. The pool has no position/ordering
 *  column, so there's no unique-constraint race to worry about here (unlike
 *  section imports, which stay sequential — see useImportPages). */
export function useCollectToPool() {
  const { user } = useSession();
  const [collecting, setCollecting] = useState(false);
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});

  const importUrlsToPool = useCallback(
    async (
      urls: string[],
      referer?: string,
      onItemDone?: (assets: LibraryAsset[]) => void
    ): Promise<LibraryAsset[]> => {
      if (urls.length === 0) return [];
      setCollecting(true);
      try {
        const results = await mapWithConcurrency(urls, CONCURRENCY, async (url) => {
          setImportStatus((prev) => ({ ...prev, [url]: "importing" }));
          const assets = await readApi.importToLibrary([url], referer);
          setImportStatus((prev) => ({ ...prev, [url]: "done" }));
          onItemDone?.(assets);
          return assets;
        });
        return results.flat();
      } finally {
        setCollecting(false);
        setImportStatus({});
      }
    },
    []
  );

  const uploadFilesToPool = useCallback(
    async (
      items: { id: string; file: File }[],
      onItemDone?: (assets: LibraryAsset[]) => void
    ): Promise<LibraryAsset[]> => {
      if (!user || items.length === 0) return [];
      setCollecting(true);
      try {
        const results = await mapWithConcurrency(items, CONCURRENCY, async ({ id, file }) => {
          setImportStatus((prev) => ({ ...prev, [id]: "importing" }));
          const path = `${user.id}/_pool/${crypto.randomUUID()}${fileExtension(file)}`;
          const size = await readImageSize(file);
          await uploadToBucket(path, file);
          const assets = await readApi.recordLibraryAssets([
            { storagePath: path, width: size?.width, height: size?.height },
          ]);
          setImportStatus((prev) => ({ ...prev, [id]: "done" }));
          onItemDone?.(assets);
          return assets;
        });
        return results.flat();
      } finally {
        setCollecting(false);
        setImportStatus({});
      }
    },
    [user]
  );

  return { importUrlsToPool, uploadFilesToPool, collecting, importStatus };
}
