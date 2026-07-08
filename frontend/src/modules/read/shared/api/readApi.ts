import camelcaseKeys from "camelcase-keys";
import { fetchWithToken } from "@/shared/lib";

/** Backend shapes for the /read endpoints, camelCased on arrival (metadata only —
 *  image bytes go through shared/lib/storage.ts, never these callers). */

export interface MangaSummary {
  id: string;
  title: string;
  description: string | null;
  coverPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SectionSummary {
  id: string;
  mangaId: string;
  kind: "volume" | "chapter";
  number: number | null;
  title: string | null;
  coverPath: string | null;
  createdAt: string;
}

export interface MangaDetail extends MangaSummary {
  sections: SectionSummary[];
}

export interface PageInfo {
  id: string;
  storagePath: string;
  position: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface LibraryAssetInfo {
  id: string;
  storagePath: string;
  sourceUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface ScrapeCandidate {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SectionCreateInput {
  kind: "volume" | "chapter";
  number?: number | null;
  title?: string | null;
}

export interface PageRecordInput {
  storagePath: string;
  position: number;
  width?: number | null;
  height?: number | null;
}

export interface LibraryAssetRecordInput {
  storagePath: string;
  sourceUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

/** One place for the fetch → error → camelCase pipeline all callers share. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithToken(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  const raw = await res.json();
  return camelcaseKeys(raw, { deep: true }) as T;
}

export const readApi = {
  // --- mangas ---
  listMangas: () => request<MangaSummary[]>("/read/mangas"),

  createManga: (title: string, description?: string | null) =>
    request<MangaSummary>("/read/mangas", {
      method: "POST",
      body: JSON.stringify({ title, description: description ?? null }),
    }),

  getManga: (mangaId: string) => request<MangaDetail>(`/read/mangas/${mangaId}`),

  updateManga: (mangaId: string, patch: { title?: string; description?: string | null; coverPath?: string | null }) =>
    request<MangaSummary>(`/read/mangas/${mangaId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.coverPath !== undefined && { cover_path: patch.coverPath }),
      }),
    }),

  deleteManga: (mangaId: string) =>
    request<void>(`/read/mangas/${mangaId}`, { method: "DELETE" }),

  // --- sections ---
  createSection: (mangaId: string, input: SectionCreateInput) =>
    request<SectionSummary>(`/read/mangas/${mangaId}/sections`, {
      method: "POST",
      body: JSON.stringify({
        kind: input.kind,
        number: input.number ?? null,
        title: input.title ?? null,
      }),
    }),

  deleteSection: (sectionId: string) =>
    request<void>(`/read/sections/${sectionId}`, { method: "DELETE" }),

  // --- pages ---
  listPages: (sectionId: string) => request<PageInfo[]>(`/read/sections/${sectionId}/pages`),

  recordPages: (sectionId: string, records: PageRecordInput[]) =>
    request<PageInfo[]>(`/read/sections/${sectionId}/pages`, {
      method: "POST",
      body: JSON.stringify(
        records.map((r) => ({
          storage_path: r.storagePath,
          position: r.position,
          width: r.width ?? null,
          height: r.height ?? null,
        }))
      ),
    }),

  reorderPages: (sectionId: string, orderedPageIds: string[]) =>
    request<void>(`/read/sections/${sectionId}/pages/order`, {
      method: "PATCH",
      body: JSON.stringify({ ordered_page_ids: orderedPageIds }),
    }),

  // --- scrape + import ---
  scrape: (url: string) =>
    request<{ candidates: ScrapeCandidate[] }>("/read/scrape", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  importInto: (sectionId: string, urls: string[], referer?: string) =>
    request<PageInfo[]>(`/read/sections/${sectionId}/import`, {
      method: "POST",
      body: JSON.stringify({ urls, referer: referer ?? null }),
    }),

  // --- library pool ---
  listLibrary: () => request<LibraryAssetInfo[]>("/read/library"),

  recordLibraryAssets: (records: LibraryAssetRecordInput[]) =>
    request<LibraryAssetInfo[]>("/read/library", {
      method: "POST",
      body: JSON.stringify(
        records.map((r) => ({
          storage_path: r.storagePath,
          source_url: r.sourceUrl ?? null,
          width: r.width ?? null,
          height: r.height ?? null,
        }))
      ),
    }),

  importToLibrary: (urls: string[], referer?: string) =>
    request<LibraryAssetInfo[]>("/read/library/import", {
      method: "POST",
      body: JSON.stringify({ urls, referer: referer ?? null }),
    }),

  organizeFromLibrary: (sectionId: string, assetIds: string[]) =>
    request<PageInfo[]>(`/read/sections/${sectionId}/pages/from-library`, {
      method: "POST",
      body: JSON.stringify({ asset_ids: assetIds }),
    }),

  discardLibraryAsset: (assetId: string) =>
    request<void>(`/read/library/${assetId}`, { method: "DELETE" }),
};
