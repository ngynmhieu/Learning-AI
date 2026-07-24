import { supabase } from "./supabase";

/** The private bucket holding every manga page image and cover (see
 *  supabase/docs/modules/read.md). Object paths are prefixed by owner
 *  (`{user_id}/...`) so Storage RLS can gate access per user. */
const MANGA_BUCKET = "manga";

/** Every object path embeds a fresh UUID and is never rewritten, so the content
 *  behind a path is immutable — safe to let browsers/CDN cache it for a year. */
const IMMUTABLE_CACHE_SECONDS = "31536000";

const SIGN_EXPIRES_IN = 3600;
/** Re-sign this long before a URL actually expires, so a cached URL handed out
 *  near the end of its life still has time to be fetched. */
const SIGN_MARGIN_MS = 5 * 60 * 1000;

/** path → still-valid signed URL. Reusing the SAME URL across page visits is
 *  what makes the browser's HTTP cache work: a re-mint changes the token in the
 *  query string, which the browser treats as a brand-new resource and re-downloads. */
const signedUrlCache = new Map<string, { url: string; freshUntil: number }>();

/** Upload one file directly to Storage (bytes never touch the backend).
 *  Rides the authenticated Supabase session, so RLS only allows paths under
 *  the caller's own `{user_id}/` prefix. */
export async function uploadToBucket(path: string, file: Blob): Promise<void> {
  const { error } = await supabase.storage.from(MANGA_BUCKET).upload(path, file, {
    cacheControl: IMMUTABLE_CACHE_SECONDS,
    ...(file.type && { contentType: file.type }),
  });
  if (error) throw new Error(error.message);
}

/** Mint short-lived CDN links for a batch of object paths (private bucket →
 *  reads go through signed URLs). Order matches the input paths. Cached per
 *  path for the session so repeat visits reuse the same URL (→ browser cache). */
export async function createSignedUrls(
  paths: string[],
  expiresIn = SIGN_EXPIRES_IN
): Promise<string[]> {
  if (paths.length === 0) return [];

  const now = Date.now();
  const missing = paths.filter((path) => {
    const hit = signedUrlCache.get(path);
    return !hit || hit.freshUntil <= now;
  });

  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(MANGA_BUCKET)
      .createSignedUrls(missing, expiresIn);
    if (error) throw new Error(error.message);
    const freshUntil = now + expiresIn * 1000 - SIGN_MARGIN_MS;
    data.forEach((item, i) => {
      // A per-item failure yields a null signedUrl — skip it so it's retried
      // next call, and the <img> just shows its placeholder meanwhile.
      if (item.signedUrl) signedUrlCache.set(missing[i], { url: item.signedUrl, freshUntil });
    });
  }

  return paths.map((path) => signedUrlCache.get(path)?.url ?? "");
}
