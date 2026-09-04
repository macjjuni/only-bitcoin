export const CHAT_REACTION_KEYS = ["rocket", "fear", "diamond", "up"] as const;

export type ChatReactionKey = (typeof CHAT_REACTION_KEYS)[number];

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

export interface ChatMessage {
  id: string;
  anonId: string;
  nickname: string;
  body: string;
  parent?: ChatMessageParent;
  reactions: ChatReactionCounts;
  myReactions?: ChatReactionKey[];
  createdAt: number;
}

export interface ChatMe {
  anonId: string;
  nickname: string;
  verifiedUntil?: number;
}

export const formatChatAnonId = (anonId: string): string => {
  return anonId.slice(0, 4);
};

export const CHAT_REACTION_LABELS: Record<ChatReactionKey, string> = {
  rocket: "🚀",
  fear: "😱",
  diamond: "💎",
  up: "👍",
};
