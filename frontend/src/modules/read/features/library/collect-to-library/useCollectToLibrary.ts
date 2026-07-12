import { useCallback, useState } from "react";
import { uploadToBucket, mapWithConcurrency } from "@/shared/lib";
import { useSession } from "@/modules/auth";
import { readApi, readImageSize, fileExtension, type ImportStatus } from "../../../shared";
import type { LibraryAsset } from "../../../entities";

/** Matches the backend's own download concurrency (see ScrapeService). */
const CONCURRENCY = 5;

/** `onBatchUpdate` fires after every item resolves, with the *whole* batch's
 *  "resolved so far" set — always in original input order regardless of which
 *  request actually finished first (an index-aligned slots array, filtered to
 *  what's landed, naturally preserves that order even with gaps). The caller
 *  re-shows exactly that array each time (see `usePoolAssets.replaceTail`),
 *  which is what makes both true at once: items appear the moment their own
 *  request finishes (not batched to the end), and the library never shows a
 *  transiently-wrong order while later items are still in flight. */
type BatchUpdate = (resolvedSoFar: LibraryAsset[]) => void;

/** Fill the library (the unassigned image staging area) — both collect flows
 *  land in `{user_id}/_pool/` with no manga attached: scrape candidates go
 *  through the backend (server-side download), local files go direct-to-storage
 *  then get recorded. Organizing them into a section is a separate, later
 *  action (`organize-from-library`) — the *only* way pages reach a section, so
 *  every "add pages" flow collects here first (see `PoolPickerModal`). Both
 *  flows run with bounded concurrency for speed. */
export function useCollectToLibrary() {
  const { user } = useSession();
  const [collecting, setCollecting] = useState(false);
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});

  const importUrlsToLibrary = useCallback(
    async (urls: string[], referer?: string, onBatchUpdate?: BatchUpdate): Promise<LibraryAsset[]> => {
      if (urls.length === 0) return [];
      setCollecting(true);
      const slots: (LibraryAsset[] | undefined)[] = new Array(urls.length);
      try {
        const results = await mapWithConcurrency(urls, CONCURRENCY, async (url, index) => {
          setImportStatus((prev) => ({ ...prev, [url]: "importing" }));
          const assets = await readApi.importToLibrary([url], referer);
          slots[index] = assets;
          setImportStatus((prev) => ({ ...prev, [url]: "done" }));
          onBatchUpdate?.(slots.filter((s): s is LibraryAsset[] => s !== undefined).flat());
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

  const uploadFilesToLibrary = useCallback(
    async (items: { id: string; file: File }[], onBatchUpdate?: BatchUpdate): Promise<LibraryAsset[]> => {
      if (!user || items.length === 0) return [];
      setCollecting(true);
      const slots: (LibraryAsset[] | undefined)[] = new Array(items.length);
      try {
        const results = await mapWithConcurrency(items, CONCURRENCY, async ({ id, file }, index) => {
          setImportStatus((prev) => ({ ...prev, [id]: "importing" }));
          const path = `${user.id}/_pool/${crypto.randomUUID()}${fileExtension(file)}`;
          const size = await readImageSize(file);
          await uploadToBucket(path, file);
          const assets = await readApi.recordLibraryAssets([
            { storagePath: path, width: size?.width, height: size?.height },
          ]);
          slots[index] = assets;
          setImportStatus((prev) => ({ ...prev, [id]: "done" }));
          onBatchUpdate?.(slots.filter((s): s is LibraryAsset[] => s !== undefined).flat());
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

  return { importUrlsToLibrary, uploadFilesToLibrary, collecting, importStatus };
}
