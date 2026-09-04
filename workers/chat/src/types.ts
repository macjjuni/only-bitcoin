export const CHAT_PROTOCOL_VERSION = 1 as const;
export const CHAT_REACTION_KEYS = ["rocket", "fear", "diamond", "up"] as const;

export type ChatReactionKey = (typeof CHAT_REACTION_KEYS)[number];

export interface ChatWorkerEnv {
  CHAT_ROOM: DurableObjectNamespace;
  CHAT_UPGRADE_RATE_LIMITER: RateLimit;
  CHAT_ALLOWED_ORIGINS: string;
  ACTOR_SECRET: string;
  ENFORCEMENT_SECRET: string;
  IP_GUARD_SECRET: string;
  PASS_SIGNING_SECRET: string;
  PASS_SIGNING_SECRET_PREVIOUS?: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_EXPECTED_HOSTNAME: string;
  CF_ACCESS_AUD: string;
  ADMIN_EMAIL_ALLOWLIST: string;
}

export interface ChatReactionCounts {
  rocket: number;
  fear: number;
  diamond: number;
  up: number;
}

export interface ChatMessageParent {
  id: string;
  anonId: string;
  nickname: string;
  snippet: string;
}

export interface ChatWireMessage {
  id: string;
  anonId: string;
  nickname: string;
  body: string;
  parent?: ChatMessageParent;
  reactions: ChatReactionCounts;
  myReactions?: ChatReactionKey[];
  createdAt: number;
}

export interface ReactionActorEntry {
  token: string;
  mask: number;
}

export interface ReactionRequestRecord {
  rid: string;
  actorToken: string;
  key: ChatReactionKey;
  active: boolean;
  createdAt: number;
}

export interface ReactionState {
  actors: ReactionActorEntry[];
  recentRequests: ReactionRequestRecord[];
  counts: ChatReactionCounts;
}

export interface StoredChatMessage extends ChatWireMessage {
  sayActorTag: string;
  requestId: string;
  reactionState: ReactionState;
}

export interface SocketAttachment {
  v: 1;
  joined: boolean;
  ipGuardKey: string;
  joinDeadlineAt?: number;
  protocolViolations: number;
  stableActorKey?: string;
  dailyActorKey?: string;
  anonId?: string;
  nickname?: string;
  verifiedUntil?: number;
}

export interface ActorStateRow {
  [columnName: string]: string | number | ArrayBuffer | null;
  stable_key: string;
  nickname: string;
  nickname_changed_at: number;
  nick_request_state: string;
  daily_actor_key: string;
  last_activity_at: number;
}

export interface MessageRow {
  [columnName: string]: string | number | ArrayBuffer | null;
  id: number;
  anon_id: string;
  nickname: string;
  body: string;
  parent_json: string | null;
  reaction_state: string;
  say_actor_tag: string;
  request_id: string;
  created_at: number;
}

export type ClientFrame =
  | { v: 1; t: "join"; clientKey: string; nickname: string; passToken?: string }
  | { v: 1; t: "verify"; rid: string; token: string }
  | { v: 1; t: "say"; rid: string; body: string; parentId?: string }
  | { v: 1; t: "react"; rid: string; id: string; key: ChatReactionKey }
  | { v: 1; t: "nick"; rid: string; nickname: string }
  | { v: 1; t: "more"; rid: string; beforeId: string };
