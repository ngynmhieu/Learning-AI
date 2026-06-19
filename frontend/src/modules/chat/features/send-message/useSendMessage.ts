import { useCallback } from "react";
import { chatApi } from "@/shared/api";
import { useConversations, useChatRegistry, type RunTurnArgs } from "../../entities";

/** The send/stop workflow for one conversation. The id is already in the URL (minted
 *  before the chat opened), so there's no navigation here — just the cross-cutting
 *  reactions the session reports: add a new chat to the sidebar / bump an existing one,
 *  and generate its title out-of-band after the first reply. */
export function useSendMessage(routeId: string) {
  const registry = useChatRegistry();
  const { upsert, bump, applyTitle } = useConversations();

  const send = useCallback(
    (args: RunTurnArgs) => {
      const session = registry.getOrCreate(routeId);
      if (session.isStreaming) return;

      void session.runTurn(args, {
        onTurnStart: (id, isFirst) => {
          if (isFirst) upsert({ id, title: "New conversation", updatedAt: Date.now() });
          else bump(id);
        },
        onComplete: (id, isFirst) => {
          if (isFirst) {
            chatApi
              .generateTitle(id)
              .then(({ title }) => applyTitle(id, title))
              .catch(() => {});
          }
        },
      });
    },
    [registry, routeId, upsert, bump, applyTitle]
  );

  const stop = useCallback(() => {
    registry.get(routeId)?.stop();
  }, [registry, routeId]);

  return { send, stop };
}
