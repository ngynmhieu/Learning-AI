import { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "../layouts";
import { ProtectedRoute, LoginPage } from "@/modules/auth";
import { ConversationsProvider, ChatSessionsProvider } from "@/modules/chat";
import { ReadLibraryProvider } from "@/modules/read";
import { LoadingDialog } from "@/shared/ui";
import { ChatPage, LectorLibraryPage, MangaDetailPage, ReaderPage, PoolPage } from "./lazyPages";
import { NewChatRedirect } from "./NewChatRedirect";

const lazily = (page: React.ReactNode) => (
  <Suspense fallback={<LoadingDialog />}>{page}</Suspense>
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // ConversationsProvider (sidebar list) + ChatSessionsProvider (per-conversation
        // message runtime + live streams) wrap the sidebar and pages so all share one
        // source of truth and streams survive navigation. ReadLibraryProvider does the
        // same for the manga library list. Inside ProtectedRoute = authed.
        element: (
          <ConversationsProvider>
            <ChatSessionsProvider>
              <ReadLibraryProvider>
                <AppLayout />
              </ReadLibraryProvider>
            </ChatSessionsProvider>
          </ConversationsProvider>
        ),
        children: [
          // "/" mints a fresh id and redirects to /c/:id, so every chat lives under the
          // single /c/:conversationId route (no /→/c remount on the first message).
          { path: "/", element: <NewChatRedirect /> },
          { path: "/c/:conversationId", element: lazily(<ChatPage />) },
          // The read module — displayed as "Lector" (paths use the display name).
          { path: "/lector", element: lazily(<LectorLibraryPage />) },
          { path: "/lector/manga/:mangaId", element: lazily(<MangaDetailPage />) },
          { path: "/lector/manga/:mangaId/read/:sectionId", element: lazily(<ReaderPage />) },
          { path: "/lector/pool", element: lazily(<PoolPage />) },
        ],
      },
    ],
  },
]);
