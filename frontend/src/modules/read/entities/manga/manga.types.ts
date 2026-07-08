/** A manga series as the UI knows it — the backend shape is already camelCased
 *  by the api layer, so the entity reuses it directly (same for detail). */
export type { MangaSummary as Manga, MangaDetail } from "../../shared/api/readApi";
