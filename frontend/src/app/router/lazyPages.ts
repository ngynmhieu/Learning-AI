import { lazy } from "react";

// Code-split route components. Kept in their own file so the router config
// (which exports a non-component `router`) stays Fast Refresh-compliant.
export const ChatPage = lazy(() =>
  import("@/modules/chat").then((m) => ({ default: m.ChatPage }))
);

export const MangaCollectionPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.MangaCollectionPage }))
);

export const MangaSectionsPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.MangaSectionsPage }))
);

export const MangaReaderPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.MangaReaderPage }))
);

export const LibraryPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.LibraryPage }))
);
