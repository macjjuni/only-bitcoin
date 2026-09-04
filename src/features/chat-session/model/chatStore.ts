import { create } from "zustand";
import type {
  ChatMe,
  ChatMessage,
  ChatMutationAction,
  ChatReactionCounts,
  ChatReactionKey,
  ChatServerFrame,
} from "@/entities/chat-message";

export type ChatConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "offline"
  | "readOnly";

export type ChatPendingStatus = "pending" | "acknowledged" | "failed" | "uncertain";

export interface ChatPendingRequest {
  rid: string;
  action: ChatMutationAction;
  status: ChatPendingStatus;
  createdAt: number;
  errorCode?: string;
  errorMessage?: string;
  parentDetached?: boolean;
}

interface NormalizedChatMessages {
  messageIds: string[];
  messagesById: Record<string, ChatMessage>;
}

interface ChatStoreState extends NormalizedChatMessages {
  connectionStatus: ChatConnectionStatus;
  me: ChatMe | null;
  online: number;
  readOnly: boolean;
  reasonCode?: string;
  hasMore: boolean;
  oldestId: string | null;
  pendingRequests: Record<string, ChatPendingRequest>;
  isTurnstileRequired: boolean;
  announcement: string;
  setConnectionStatus: (connectionStatus: ChatConnectionStatus) => void;
  addPendingRequest: (rid: string, action: ChatMutationAction) => void;
  markPendingRequestsUncertain: () => void;
  removePendingRequest: (rid: string) => void;
  applyServerFrame: (frame: ChatServerFrame) => void;
  clearTurnstileRequired: () => void;
  resetChatStore: () => void;
}

const MAXIMUM_MESSAGE_COUNT = 300;
const MAXIMUM_PENDING_REQUEST_COUNT = 64;

const initialChatState = {
  connectionStatus: "idle" as const,
  me: null,
  online: 0,
  readOnly: false,
  reasonCode: undefined,
  messageIds: [],
  messagesById: {},
  hasMore: true,
  oldestId: null,
  pendingRequests: {},
  isTurnstileRequired: false,
  announcement: "",
};

// region [Privates]
const compareMessageIds = (leftMessageId: string, rightMessageId: string): number => {
  try {
    const leftNumericId = BigInt(leftMessageId);
    const rightNumericId = BigInt(rightMessageId);

    if (leftNumericId < rightNumericId) {
      return -1;
    }
    if (leftNumericId > rightNumericId) {
      return 1;
    }
    return 0;
  } catch {
    return leftMessageId.localeCompare(rightMessageId);
  }
};

const updateMessageReactionCounts = (
  messagesById: Record<string, ChatMessage>,
  messageId: string,
  reactions: ChatReactionCounts,
): Record<string, ChatMessage> => {
  const currentMessage = messagesById[messageId];

  if (!currentMessage) {
    return messagesById;
  }

  return {
    ...messagesById,
    [messageId]: { ...currentMessage, reactions },
  };
};

const updateMyReaction = (
  messagesById: Record<string, ChatMessage>,
  messageId: string,
  reactionKey: ChatReactionKey,
  isActive: boolean,
): Record<string, ChatMessage> => {
  const currentMessage = messagesById[messageId];

  if (!currentMessage) {
    return messagesById;
  }

  const currentMyReactions = currentMessage.myReactions ?? [];
  const nextMyReactions = isActive
    ? Array.from(new Set([...currentMyReactions, reactionKey]))
    : currentMyReactions.filter((currentReactionKey) => currentReactionKey !== reactionKey);

  return {
    ...messagesById,
    [messageId]: { ...currentMessage, myReactions: nextMyReactions },
  };
};

const deleteChatMessage = (
  normalizedMessages: NormalizedChatMessages,
  deletedMessageId: string,
): NormalizedChatMessages => {
  const nextMessagesById = { ...normalizedMessages.messagesById };
  delete nextMessagesById[deletedMessageId];

  for (const messageId of normalizedMessages.messageIds) {
    const currentMessage = nextMessagesById[messageId];

    if (currentMessage?.parent?.id === deletedMessageId) {
      nextMessagesById[messageId] = {
        ...currentMessage,
        parent: { ...currentMessage.parent, snippet: "" },
      };
    }
  }

  return {
    messageIds: normalizedMessages.messageIds.filter((messageId) => messageId !== deletedMessageId),
    messagesById: nextMessagesById,
  };
};
// endregion

export const mergeChatMessages = (
  normalizedMessages: NormalizedChatMessages,
  incomingMessages: ChatMessage[],
): NormalizedChatMessages => {
  const nextMessagesById = { ...normalizedMessages.messagesById };

  for (const incomingMessage of incomingMessages) {
    const currentMessage = nextMessagesById[incomingMessage.id];
    const preservedMyReactions = incomingMessage.myReactions ?? currentMessage?.myReactions ?? [];
    nextMessagesById[incomingMessage.id] = {
      ...currentMessage,
      ...incomingMessage,
      myReactions: preservedMyReactions,
    };
  }

  const sortedMessageIds = Object.keys(nextMessagesById).sort(compareMessageIds);
  const retainedMessageIds = sortedMessageIds.slice(-MAXIMUM_MESSAGE_COUNT);
  const retainedMessageIdSet = new Set(retainedMessageIds);

  for (const messageId of sortedMessageIds) {
    if (!retainedMessageIdSet.has(messageId)) {
      delete nextMessagesById[messageId];
    }
  }

  return { messageIds: retainedMessageIds, messagesById: nextMessagesById };
};

const useChatStore = create<ChatStoreState>((set) => ({
  ...initialChatState,
  setConnectionStatus: (connectionStatus) => {
    set({ connectionStatus });
  },
  addPendingRequest: (rid, action) => {
    set((currentState) => {
      const retainedPendingRequests = Object.values(currentState.pendingRequests)
        .sort((leftRequest, rightRequest) => leftRequest.createdAt - rightRequest.createdAt)
        .slice(-(MAXIMUM_PENDING_REQUEST_COUNT - 1));
      const nextPendingRequests = Object.fromEntries(
        retainedPendingRequests.map((pendingRequest) => [pendingRequest.rid, pendingRequest]),
      );

      nextPendingRequests[rid] = {
        rid,
        action,
        status: "pending",
        createdAt: Date.now(),
      };

      return { pendingRequests: nextPendingRequests };
    });
  },
  markPendingRequestsUncertain: () => {
    set((currentState) => ({
      pendingRequests: Object.fromEntries(
        Object.entries(currentState.pendingRequests).map(([rid, pendingRequest]) => [
          rid,
          pendingRequest.status === "pending"
            ? { ...pendingRequest, status: "uncertain" as const }
            : pendingRequest,
        ]),
      ),
    }));
  },
  removePendingRequest: (rid) => {
    set((currentState) => {
      const nextPendingRequests = { ...currentState.pendingRequests };
      delete nextPendingRequests[rid];
      return { pendingRequests: nextPendingRequests };
    });
  },
  applyServerFrame: (frame) => {
    set((currentState) => {
      switch (frame.t) {
        case "init": {
          const normalizedMessages = mergeChatMessages(currentState, frame.messages);
          return {
            ...normalizedMessages,
            connectionStatus: frame.readOnly ? ("readOnly" as const) : ("open" as const),
            me: frame.me,
            online: frame.online,
            readOnly: frame.readOnly,
            reasonCode: frame.reasonCode,
            hasMore: frame.hasMore ?? frame.messages.length === 50,
            oldestId: normalizedMessages.messageIds[0] ?? null,
            announcement: "채팅에 연결됐어요.",
          };
        }
        case "msg": {
          const normalizedMessages = mergeChatMessages(currentState, [frame.message]);
          return {
            ...normalizedMessages,
            oldestId: normalizedMessages.messageIds[0] ?? null,
            announcement: "새 메시지가 도착했어요.",
          };
        }
        case "react": {
          let nextMessagesById = currentState.messagesById;

          for (const reactionUpdate of frame.updates) {
            nextMessagesById = updateMessageReactionCounts(
              nextMessagesById,
              reactionUpdate.id,
              reactionUpdate.reactions,
            );
          }

          return { messagesById: nextMessagesById };
        }
        case "delete": {
          const normalizedMessages = deleteChatMessage(currentState, frame.id);
          return {
            ...normalizedMessages,
            oldestId: normalizedMessages.messageIds[0] ?? null,
            announcement: "관리자에 의해 메시지가 삭제됐어요.",
          };
        }
        case "nick":
        case "me":
          return { me: frame.me };
        case "more": {
          const normalizedMessages = mergeChatMessages(currentState, frame.messages);
          const currentPendingRequest = currentState.pendingRequests[frame.rid];
          return {
            ...normalizedMessages,
            hasMore: frame.hasMore,
            oldestId: normalizedMessages.messageIds[0] ?? null,
            pendingRequests: {
              ...currentState.pendingRequests,
              [frame.rid]: currentPendingRequest
                ? { ...currentPendingRequest, status: "acknowledged" as const }
                : {
                    rid: frame.rid,
                    action: "more" as const,
                    status: "acknowledged" as const,
                    createdAt: Date.now(),
                  },
            },
          };
        }
        case "online":
          return { online: frame.n };
        case "state":
          return {
            readOnly: frame.readOnly,
            reasonCode: frame.reasonCode,
            connectionStatus: frame.readOnly ? ("readOnly" as const) : ("open" as const),
          };
        case "ack": {
          const currentPendingRequest = currentState.pendingRequests[frame.rid];
          let nextMessagesById = currentState.messagesById;

          if (frame.reaction) {
            nextMessagesById = updateMyReaction(
              nextMessagesById,
              frame.reaction.id,
              frame.reaction.key,
              frame.reaction.active,
            );
          }

          return {
            messagesById: nextMessagesById,
            isTurnstileRequired:
              frame.action === "verify" ? false : currentState.isTurnstileRequired,
            pendingRequests: {
              ...currentState.pendingRequests,
              [frame.rid]: currentPendingRequest
                ? {
                    ...currentPendingRequest,
                    status: "acknowledged" as const,
                    parentDetached: frame.parentDetached,
                  }
                : {
                    rid: frame.rid,
                    action: frame.action,
                    status: "acknowledged" as const,
                    createdAt: Date.now(),
                    parentDetached: frame.parentDetached,
                  },
            },
            announcement: frame.parentDetached
              ? "답글 대상이 사라져 일반 메시지로 등록됐어요."
              : currentState.announcement,
          };
        }
        case "err": {
          const isTurnstileRequired = frame.code === "TURNSTILE_REQUIRED";

          if (!frame.rid) {
            return {
              isTurnstileRequired: currentState.isTurnstileRequired || isTurnstileRequired,
              announcement: frame.message,
            };
          }

          const currentPendingRequest = currentState.pendingRequests[frame.rid];
          return {
            isTurnstileRequired: currentState.isTurnstileRequired || isTurnstileRequired,
            pendingRequests: {
              ...currentState.pendingRequests,
              [frame.rid]: currentPendingRequest
                ? {
                    ...currentPendingRequest,
                    status: "failed" as const,
                    errorCode: frame.code,
                    errorMessage: frame.message,
                  }
                : {
                    rid: frame.rid,
                    action: "say" as const,
                    status: "failed" as const,
                    createdAt: Date.now(),
                    errorCode: frame.code,
                    errorMessage: frame.message,
                  },
            },
            announcement: frame.message,
          };
        }
        default:
          return currentState;
      }
    });
  },
  clearTurnstileRequired: () => {
    set({ isTurnstileRequired: false });
  },
  resetChatStore: () => {
    set(initialChatState);
  },
}));

export default useChatStore;
