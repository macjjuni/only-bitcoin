"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type ChatClientFrame,
  type ChatMutationAction,
  type ChatReactionKey,
  parseChatServerFrame,
} from "@/entities/chat-message";
import { chatConfig } from "@/shared/config/chat";
import { ChatSocket } from "../api/chatSocket";
import type { ChatIdentity } from "./chatIdentity";
import { saveChatNickname, saveChatPassToken } from "./chatIdentity";
import useChatStore from "./chatStore";
import { calculateReconnectDelayInMilliseconds } from "./reconnectBackoff";

interface UseChatConnectionOptions {
  isEnabled: boolean;
  identity: ChatIdentity | null;
}

export interface ChatConnectionActions {
  sendMessage: (body: string, parentId?: string) => string | null;
  toggleReaction: (messageId: string, reactionKey: ChatReactionKey) => string | null;
  changeNickname: (nickname: string) => string | null;
  requestMoreMessages: (beforeId: string) => string | null;
  verifyTurnstileToken: (turnstileToken: string) => string | null;
  retryConnection: () => void;
}

const JOIN_TIMEOUT_CLOSE_CODE = 4009;

export const useChatConnection = ({
  isEnabled,
  identity,
}: UseChatConnectionOptions): ChatConnectionActions => {
  // region [Hooks]
  const chatSocketReference = useRef<ChatSocket>(new ChatSocket());
  const reconnectTimerReference = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptReference = useRef(0);
  const isEnabledReference = useRef(isEnabled);
  const identityReference = useRef(identity);
  const connectChatReference = useRef<() => void>(() => undefined);
  // endregion

  // region [Privates]
  const clearReconnectTimer = useCallback((): void => {
    if (reconnectTimerReference.current) {
      clearTimeout(reconnectTimerReference.current);
      reconnectTimerReference.current = null;
    }
  }, []);

  const canConnectNow = (): boolean => {
    return (
      isEnabledReference.current &&
      identityReference.current !== null &&
      navigator.onLine &&
      document.visibilityState === "visible"
    );
  };

  const scheduleReconnect = (): void => {
    clearReconnectTimer();

    if (!canConnectNow()) {
      return;
    }

    const reconnectDelayInMilliseconds = calculateReconnectDelayInMilliseconds(
      retryAttemptReference.current,
    );
    retryAttemptReference.current += 1;
    useChatStore.getState().setConnectionStatus("reconnecting");
    reconnectTimerReference.current = setTimeout(() => {
      connectChatReference.current();
    }, reconnectDelayInMilliseconds);
  };

  const disconnectChat = useCallback((): void => {
    clearReconnectTimer();
    chatSocketReference.current.disconnect();
    useChatStore.getState().markPendingRequestsUncertain();
    useChatStore.getState().setConnectionStatus("idle");
  }, [clearReconnectTimer]);

  const connectChat = useCallback((): void => {
    const currentIdentity = identityReference.current;

    if (!canConnectNow() || !currentIdentity || !chatConfig.isConnectionConfigured) {
      return;
    }
    if (chatSocketReference.current.isOpen() || chatSocketReference.current.isConnecting()) {
      return;
    }

    clearReconnectTimer();
    useChatStore
      .getState()
      .setConnectionStatus(retryAttemptReference.current > 0 ? "reconnecting" : "connecting");
    chatSocketReference.current.connect(chatConfig.webSocketUrl, {
      onOpen: () => {
        const joinFrame: ChatClientFrame = {
          v: 1,
          t: "join",
          clientKey: currentIdentity.clientKey,
          nickname: currentIdentity.nickname,
          passToken: currentIdentity.passToken,
        };
        chatSocketReference.current.send(joinFrame);
      },
      onMessage: (rawPayload) => {
        const serverFrame = parseChatServerFrame(rawPayload);

        if (!serverFrame) {
          return;
        }

        if (serverFrame.t === "init") {
          retryAttemptReference.current = 0;
        }
        if (serverFrame.t === "ack" && serverFrame.passToken) {
          saveChatPassToken(serverFrame.passToken);
          identityReference.current = {
            ...currentIdentity,
            passToken: serverFrame.passToken,
          };
        }
        if (serverFrame.t === "nick") {
          saveChatNickname(serverFrame.me.nickname);
          identityReference.current = {
            ...(identityReference.current ?? currentIdentity),
            nickname: serverFrame.me.nickname,
          };
        }

        useChatStore.getState().applyServerFrame(serverFrame);
      },
      onClose: (closeEvent) => {
        useChatStore.getState().markPendingRequestsUncertain();

        if (closeEvent.code === JOIN_TIMEOUT_CLOSE_CODE) {
          useChatStore.getState().setConnectionStatus("idle");
          useChatStore.getState().applyServerFrame({
            v: 1,
            t: "err",
            code: "JOIN_TIMEOUT",
            message: "연결 준비 시간이 초과됐어요. 다시 연결해 주세요.",
          });
          return;
        }

        scheduleReconnect();
      },
      onError: () => {
        if (!navigator.onLine) {
          useChatStore.getState().setConnectionStatus("offline");
        }
      },
    });
  }, [clearReconnectTimer]);

  connectChatReference.current = connectChat;

  const sendMutationFrame = useCallback(
    (frame: ChatClientFrame, action: ChatMutationAction): string | null => {
      if (!("rid" in frame) || !chatSocketReference.current.send(frame)) {
        return null;
      }

      useChatStore.getState().addPendingRequest(frame.rid, action);
      return frame.rid;
    },
    [],
  );
  // endregion

  // region [Transactions]
  const sendMessage = useCallback(
    (body: string, parentId?: string): string | null => {
      const rid = window.crypto.randomUUID();
      return sendMutationFrame({ v: 1, t: "say", rid, body, parentId }, "say");
    },
    [sendMutationFrame],
  );

  const toggleReaction = useCallback(
    (messageId: string, reactionKey: ChatReactionKey): string | null => {
      const rid = window.crypto.randomUUID();
      return sendMutationFrame({ v: 1, t: "react", rid, id: messageId, key: reactionKey }, "react");
    },
    [sendMutationFrame],
  );

  const changeNickname = useCallback(
    (nickname: string): string | null => {
      const rid = window.crypto.randomUUID();
      return sendMutationFrame({ v: 1, t: "nick", rid, nickname }, "nick");
    },
    [sendMutationFrame],
  );

  const requestMoreMessages = useCallback(
    (beforeId: string): string | null => {
      const rid = window.crypto.randomUUID();
      return sendMutationFrame({ v: 1, t: "more", rid, beforeId }, "more");
    },
    [sendMutationFrame],
  );

  const verifyTurnstileToken = useCallback(
    (turnstileToken: string): string | null => {
      const rid = window.crypto.randomUUID();
      return sendMutationFrame({ v: 1, t: "verify", rid, token: turnstileToken }, "verify");
    },
    [sendMutationFrame],
  );

  const retryConnection = useCallback((): void => {
    retryAttemptReference.current = 0;
    connectChat();
  }, [connectChat]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    isEnabledReference.current = isEnabled;
    identityReference.current = identity;

    if (isEnabled) {
      connectChat();
    } else {
      disconnectChat();
    }

    return () => {
      disconnectChat();
    };
  }, [connectChat, disconnectChat, identity, isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const onVisibilityChangeDocument = (): void => {
      if (document.visibilityState === "hidden") {
        clearReconnectTimer();
        return;
      }

      if (!chatSocketReference.current.isOpen()) {
        connectChat();
      }
    };
    const onOfflineWindow = (): void => {
      clearReconnectTimer();
      useChatStore.getState().setConnectionStatus("offline");
    };
    const onOnlineWindow = (): void => {
      connectChat();
    };

    document.addEventListener("visibilitychange", onVisibilityChangeDocument);
    window.addEventListener("offline", onOfflineWindow);
    window.addEventListener("online", onOnlineWindow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChangeDocument);
      window.removeEventListener("offline", onOfflineWindow);
      window.removeEventListener("online", onOnlineWindow);
    };
  }, [clearReconnectTimer, connectChat, isEnabled]);
  // endregion

  return {
    sendMessage,
    toggleReaction,
    changeNickname,
    requestMoreMessages,
    verifyTurnstileToken,
    retryConnection,
  };
};
