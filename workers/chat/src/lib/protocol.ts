import { CHAT_REACTION_KEYS, type ChatReactionKey, type ClientFrame } from "../types";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const MESSAGE_ID_PATTERN = /^[1-9][0-9]{0,18}$/;

// region [Privates]
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isRequestId = (value: unknown): value is string => {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
};

const isMessageId = (value: unknown): value is string => {
  return typeof value === "string" && MESSAGE_ID_PATTERN.test(value);
};

const isReactionKey = (value: unknown): value is ChatReactionKey => {
  return typeof value === "string" && CHAT_REACTION_KEYS.includes(value as ChatReactionKey);
};
// endregion

export const parseClientFrame = (rawPayload: string): ClientFrame | null => {
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    return null;
  }

  if (!isRecord(parsedPayload) || parsedPayload.v !== 1 || typeof parsedPayload.t !== "string") {
    return null;
  }

  switch (parsedPayload.t) {
    case "join":
      if (
        typeof parsedPayload.clientKey === "string" &&
        CLIENT_KEY_PATTERN.test(parsedPayload.clientKey) &&
        typeof parsedPayload.nickname === "string" &&
        (parsedPayload.passToken === undefined || typeof parsedPayload.passToken === "string")
      ) {
        return parsedPayload as ClientFrame;
      }
      return null;
    case "verify":
      return isRequestId(parsedPayload.rid) && typeof parsedPayload.token === "string"
        ? (parsedPayload as ClientFrame)
        : null;
    case "say":
      return isRequestId(parsedPayload.rid) &&
        typeof parsedPayload.body === "string" &&
        (parsedPayload.parentId === undefined || isMessageId(parsedPayload.parentId))
        ? (parsedPayload as ClientFrame)
        : null;
    case "react":
      return isRequestId(parsedPayload.rid) &&
        isMessageId(parsedPayload.id) &&
        isReactionKey(parsedPayload.key)
        ? (parsedPayload as ClientFrame)
        : null;
    case "nick":
      return isRequestId(parsedPayload.rid) && typeof parsedPayload.nickname === "string"
        ? (parsedPayload as ClientFrame)
        : null;
    case "more":
      return isRequestId(parsedPayload.rid) && isMessageId(parsedPayload.beforeId)
        ? (parsedPayload as ClientFrame)
        : null;
    default:
      return null;
  }
};
