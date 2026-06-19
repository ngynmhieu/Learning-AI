import { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "../layouts";
import { ProtectedRoute, LoginPage } from "@/modules/auth";
import { ConversationsProvider, ChatSessionsProvider } from "@/modules/chat";
import { LoadingDialog } from "@/shared/ui";
import { ChatPage } from "./lazyPages";
import { NewChatRedirect } from "./NewChatRedirect";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        // ConversationsProvider (sidebar list) + ChatSessionsProvider (per-conversation
        // message runtime + live streams) wrap the sidebar and pages so all share one
        // source of truth and streams survive navigation. Inside ProtectedRoute = authed.
        element: (
          <ConversationsProvider>
            <ChatSessionsProvider>
              <AppLayout />
            </ChatSessionsProvider>
          </ConversationsProvider>
        ),
        children: [
          // "/" mints a fresh id and redirects to /c/:id, so every chat lives under the
          // single /c/:conversationId route (no /→/c remount on the first message).
          { path: "/", element: <NewChatRedirect /> },
          {
            path: "/c/:conversationId",
            element: (
              <Suspense fallback={<LoadingDialog />}>
                <ChatPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
