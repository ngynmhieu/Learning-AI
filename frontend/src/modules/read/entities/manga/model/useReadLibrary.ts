import { useContext } from "react";
import { ReadLibraryContext } from "./readLibraryContext";

export function useReadLibrary() {
  const ctx = useContext(ReadLibraryContext);
  if (!ctx) throw new Error("useReadLibrary must be used inside ReadLibraryProvider");
  return ctx;
}
