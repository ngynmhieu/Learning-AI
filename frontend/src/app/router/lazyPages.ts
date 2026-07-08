import { lazy } from "react";

// Code-split route components. Kept in their own file so the router config
// (which exports a non-component `router`) stays Fast Refresh-compliant.
export const ChatPage = lazy(() =>
  import("@/modules/chat").then((m) => ({ default: m.ChatPage }))
);

export const LectorLibraryPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.LectorLibraryPage }))
);

export const MangaDetailPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.MangaDetailPage }))
);

export const ReaderPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.ReaderPage }))
);

export const PoolPage = lazy(() =>
  import("@/modules/read").then((m) => ({ default: m.PoolPage }))
);
