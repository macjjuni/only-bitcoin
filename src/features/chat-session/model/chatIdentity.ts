import { CHAT_MAX_NICKNAME_GRAPHEMES, CHAT_STORAGE_KEYS } from "@/shared/config/chat";
import { countGraphemes } from "@/shared/lib/text/countGraphemes";

export interface ChatIdentity {
  clientKey: string;
  nickname: string;
  passToken?: string;
}

const DEFAULT_CHAT_NICKNAME = "익명";
const CLIENT_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const PASS_TOKEN_PATTERN = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}$/;

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

const isValidStoredPassToken = (passToken: string | null): passToken is string => {
  return Boolean(passToken && passToken.length <= 4096 && PASS_TOKEN_PATTERN.test(passToken));
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
  const storedPassToken = window.localStorage.getItem(CHAT_STORAGE_KEYS.passToken);

  window.localStorage.setItem(CHAT_STORAGE_KEYS.clientKey, clientKey);
  window.localStorage.setItem(CHAT_STORAGE_KEYS.nickname, nickname);

  if (!isValidStoredPassToken(storedPassToken)) {
    window.localStorage.removeItem(CHAT_STORAGE_KEYS.passToken);
  }

  return {
    clientKey,
    nickname,
    passToken: isValidStoredPassToken(storedPassToken) ? storedPassToken : undefined,
  };
};

export const saveChatNickname = (nickname: string): void => {
  window.localStorage.setItem(CHAT_STORAGE_KEYS.nickname, nickname);
};

export const saveChatPassToken = (passToken: string): void => {
  if (isValidStoredPassToken(passToken)) {
    window.localStorage.setItem(CHAT_STORAGE_KEYS.passToken, passToken);
  }
};
