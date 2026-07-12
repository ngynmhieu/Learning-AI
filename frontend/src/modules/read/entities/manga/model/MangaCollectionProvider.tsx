import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/modules/auth";
import { readApi } from "../../../shared";
import type { Manga } from "../manga.types";
import { MangaCollectionContext } from "./mangaCollectionContext";

/** Single source of truth for the manga collection, shared by the collection grid
 *  and the detail pages. Mirrors the ConversationsProvider pattern. */
export function MangaCollectionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await readApi.listMangas();
      setMangas(list);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — no synchronous setState in the effect body.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    readApi
      .listMangas()
      .then((list) => {
        if (cancelled) return;
        setMangas(list);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const create = useCallback(async (title: string, description?: string | null) => {
    const manga = await readApi.createManga(title, description);
    setMangas((prev) => [manga, ...prev]);
    return manga;
  }, []);

  const update = useCallback(
    async (
      id: string,
      patch: { title?: string; description?: string | null; coverPath?: string | null }
    ) => {
      const updated = await readApi.updateManga(id, patch);
      setMangas((prev) => prev.map((m) => (m.id === id ? updated : m)));
    },
    []
  );

  const applyUpdate = useCallback((manga: Manga) => {
    setMangas((prev) => prev.map((m) => (m.id === manga.id ? manga : m)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await readApi.deleteManga(id);
    setMangas((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const value = useMemo(
    () => ({ mangas, loading, error, refresh, create, update, applyUpdate, remove }),
    [mangas, loading, error, refresh, create, update, applyUpdate, remove]
  );

  return <MangaCollectionContext.Provider value={value}>{children}</MangaCollectionContext.Provider>;
}
