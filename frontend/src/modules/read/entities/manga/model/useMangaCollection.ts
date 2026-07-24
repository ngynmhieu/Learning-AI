import { useContext } from "react";
import { MangaCollectionContext } from "./mangaCollectionContext";

export function useMangaCollection() {
  const ctx = useContext(MangaCollectionContext);
  if (!ctx) throw new Error("useMangaCollection must be used inside MangaCollectionProvider");
  return ctx;
}
