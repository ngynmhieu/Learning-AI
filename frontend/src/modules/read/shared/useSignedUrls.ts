import { useEffect, useState } from "react";
import { createSignedUrls } from "@/shared/lib";

/** Batch-sign a set of Storage paths (private bucket → temporary CDN links) and
 *  return a path → signed-URL map. One `createSignedUrls` call per distinct path
 *  set — the reader signs a whole section at once, grids sign all covers at once. */
export function useSignedUrls(paths: (string | null | undefined)[]): Record<string, string> {
  // Paths are `{user_id}/{...}/{uuid}.{ext}` — never contain "|", so a joined
  // string is a safe, stable dependency key (avoids re-signing on array identity).
  const key = paths.filter(Boolean).join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!key) return; // nothing to sign; the empty map is returned below
    const valid = key.split("|");
    let cancelled = false;
    createSignedUrls(valid)
      .then((signed) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        valid.forEach((path, i) => {
          if (signed[i]) map[path] = signed[i];
        });
        setUrls(map);
      })
      .catch(() => {
        if (!cancelled) setUrls({});
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // While a new path set is signing, lookups for the new paths simply miss (the
  // map still holds the previous set) — consumers show placeholders until it lands.
  return key ? urls : {};
}
