import {
  CHAT_REACTION_KEYS,
  type ChatMe,
  type ChatMessage,
  type ChatReactionCounts,
  type ChatReactionKey,
} from "./chatMessage";

export type ChatClientFrame =
  | { v: 1; t: "join"; clientKey: string; nickname: string; passToken?: string }
  | { v: 1; t: "verify"; rid: string; token: string }
  | { v: 1; t: "say"; rid: string; body: string; parentId?: string }
  | { v: 1; t: "react"; rid: string; id: string; key: ChatReactionKey }
  | { v: 1; t: "nick"; rid: string; nickname: string }
  | { v: 1; t: "more"; rid: string; beforeId: string };

export type ChatMutationAction = "verify" | "say" | "react" | "nick" | "more";

export type ChatServerFrame =
  | {
      v: 1;
      t: "init";
      messages: ChatMessage[];
      me: ChatMe;
      online: number;
      readOnly: boolean;
      reasonCode?: string;
      serverTime: number;
      hasMore?: boolean;
    }
  | {
      v: 1;
      t: "ack";
      rid: string;
      action: ChatMutationAction;
      id?: string;
      passToken?: string;
      reaction?: { id: string; key: ChatReactionKey; active: boolean };
      parentDetached?: boolean;
    }
  | { v: 1; t: "msg"; message: ChatMessage }
  | { v: 1; t: "react"; updates: Array<{ id: string; reactions: ChatReactionCounts }> }
  | { v: 1; t: "delete"; id: string }
  | { v: 1; t: "nick"; me: ChatMe }
  | { v: 1; t: "more"; rid: string; messages: ChatMessage[]; hasMore: boolean }
  | { v: 1; t: "me"; me: ChatMe }
  | { v: 1; t: "online"; n: number }
  | { v: 1; t: "state"; readOnly: boolean; reasonCode?: string }
  | {
      v: 1;
      t: "err";
      rid?: string;
      code: string;
      message: string;
      retryAfterMs?: number;
    };

// region [Privates]
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

const isNonNegativeNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
};

const isReactionKey = (value: unknown): value is ChatReactionKey => {
  return isString(value) && CHAT_REACTION_KEYS.includes(value as ChatReactionKey);
};

const isChatReactionCounts = (value: unknown): value is ChatReactionCounts => {
  if (!isRecord(value)) {
    return false;
  }

  return CHAT_REACTION_KEYS.every((reactionKey) => isNonNegativeNumber(value[reactionKey]));
};

const isChatMe = (value: unknown): value is ChatMe => {
  if (!isRecord(value)) {
    return false;
  }

  const hasValidVerifiedUntil =
    value.verifiedUntil === undefined || isNonNegativeNumber(value.verifiedUntil);

  return isString(value.anonId) && isString(value.nickname) && hasValidVerifiedUntil;
};

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!isRecord(value)) {
    return false;
  }

  const hasValidParent =
    value.parent === undefined ||
    (isRecord(value.parent) &&
      isString(value.parent.id) &&
      isString(value.parent.anonId) &&
      isString(value.parent.nickname) &&
      isString(value.parent.snippet));
  const hasValidMyReactions =
    value.myReactions === undefined ||
    (Array.isArray(value.myReactions) && value.myReactions.every(isReactionKey));

  return (
    isString(value.id) &&
    isString(value.anonId) &&
    isString(value.nickname) &&
    isString(value.body) &&
    hasValidParent &&
    isChatReactionCounts(value.reactions) &&
    hasValidMyReactions &&
    isNonNegativeNumber(value.createdAt)
  );
};

const isChatMessageArray = (value: unknown): value is ChatMessage[] => {
  return Array.isArray(value) && value.every(isChatMessage);
};
// endregion

/** 외부 WebSocket payload를 상태에 반영하기 전에 런타임에서 검증한다. */
export const parseChatServerFrame = (rawPayload: string): ChatServerFrame | null => {
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    return null;
  }

  if (!isRecord(parsedPayload) || parsedPayload.v !== 1 || !isString(parsedPayload.t)) {
    return null;
  }

  switch (parsedPayload.t) {
    case "init":
      if (
        isChatMessageArray(parsedPayload.messages) &&
        isChatMe(parsedPayload.me) &&
        isNonNegativeNumber(parsedPayload.online) &&
        typeof parsedPayload.readOnly === "boolean" &&
        isNonNegativeNumber(parsedPayload.serverTime) &&
        (parsedPayload.hasMore === undefined || typeof parsedPayload.hasMore === "boolean") &&
        (parsedPayload.reasonCode === undefined || isString(parsedPayload.reasonCode))
      ) {
        return parsedPayload as ChatServerFrame;
      }
      return null;
    case "ack":
      if (!isString(parsedPayload.rid) || !isString(parsedPayload.action)) {
        return null;
      }
      if (!["verify", "say", "react", "nick", "more"].includes(parsedPayload.action)) {
        return null;
      }
      if (parsedPayload.reaction !== undefined) {
        const reaction = parsedPayload.reaction;
        if (
          !isRecord(reaction) ||
          !isString(reaction.id) ||
          !isReactionKey(reaction.key) ||
          typeof reaction.active !== "boolean"
        ) {
          return null;
        }
      }
      return parsedPayload as ChatServerFrame;
    case "msg":
      return isChatMessage(parsedPayload.message) ? (parsedPayload as ChatServerFrame) : null;
    case "react":
      if (
        Array.isArray(parsedPayload.updates) &&
        parsedPayload.updates.every((update) => {
          return isRecord(update) && isString(update.id) && isChatReactionCounts(update.reactions);
        })
      ) {
        return parsedPayload as ChatServerFrame;
      }
      return null;
    case "delete":
      return isString(parsedPayload.id) ? (parsedPayload as ChatServerFrame) : null;
    case "nick":
    case "me":
      return isChatMe(parsedPayload.me) ? (parsedPayload as ChatServerFrame) : null;
    case "more":
      if (
        isString(parsedPayload.rid) &&
        isChatMessageArray(parsedPayload.messages) &&
        typeof parsedPayload.hasMore === "boolean"
      ) {
        return parsedPayload as ChatServerFrame;
      }
      return null;
    case "online":
      return isNonNegativeNumber(parsedPayload.n) ? (parsedPayload as ChatServerFrame) : null;
    case "state":
      return typeof parsedPayload.readOnly === "boolean"
        ? (parsedPayload as ChatServerFrame)
        : null;
    case "err":
      return isString(parsedPayload.code) && isString(parsedPayload.message)
        ? (parsedPayload as ChatServerFrame)
        : null;
    default:
      return null;
  }
};
