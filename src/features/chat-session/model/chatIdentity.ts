import { CHAT_MAX_NICKNAME_GRAPHEMES, CHAT_STORAGE_KEYS } from "@/shared/config/chat";
import { countGraphemes } from "@/shared/lib/text/countGraphemes";

/**
 * 스페이스 입장에 쓰는 브라우저 신원.
 *
 * 익명 공개 채팅 시절에 만든 저장 키를 그대로 씀. 키를 바꾸면 기존 사용자의
 * 닉네임·스폰 위치·아바타 색이 전부 새로 뽑힘.
 */
export interface ChatIdentity {
  clientKey: string;
  nickname: string;
}

const DEFAULT_CHAT_NICKNAME = "익명";
const CLIENT_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;

// region [Privates]
const encodeBase64Url = (bytes: Uint8Array): string => {
  const binaryValue = Array.from(bytes, (byteValue) => String.fromCharCode(byteValue)).join("");
  return window.btoa(binaryValue).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const createClientKey = (): string => {
  return encodeBase64Url(window.crypto.getRandomValues(new Uint8Array(32)));
};

const isValidStoredNickname = (nickname: string | null): nickname is string => {
  if (!nickname || nickname.includes("#")) {
    return false;
  }

  return countGraphemes(nickname.trim()) <= CHAT_MAX_NICKNAME_GRAPHEMES;
};
// endregion

export const loadOrCreateChatIdentity = (): ChatIdentity => {
  const storedClientKey = window.localStorage.getItem(CHAT_STORAGE_KEYS.clientKey);
  const clientKey =
    storedClientKey && CLIENT_KEY_PATTERN.test(storedClientKey)
      ? storedClientKey
      : createClientKey();
  const storedNickname = window.localStorage.getItem(CHAT_STORAGE_KEYS.nickname);
  const nickname = isValidStoredNickname(storedNickname)
    ? storedNickname.trim()
    : DEFAULT_CHAT_NICKNAME;

  window.localStorage.setItem(CHAT_STORAGE_KEYS.clientKey, clientKey);
  window.localStorage.setItem(CHAT_STORAGE_KEYS.nickname, nickname);

  return { clientKey, nickname };
};

export const saveChatNickname = (nickname: string): void => {
  window.localStorage.setItem(CHAT_STORAGE_KEYS.nickname, nickname);
};
