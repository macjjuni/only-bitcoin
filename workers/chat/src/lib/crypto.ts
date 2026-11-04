const textEncoder = new TextEncoder();

// region [Privates]
const bytesToHex = (bytes: ArrayBuffer): string => {
  return Array.from(new Uint8Array(bytes), (byteValue) =>
    byteValue.toString(16).padStart(2, "0"),
  ).join("");
};

const createHmacSignature = async (secret: string, value: string): Promise<ArrayBuffer> => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(value));
};
// endregion

export const createHmacHex = async (secret: string, value: string): Promise<string> => {
  return bytesToHex(await createHmacSignature(secret, value));
};

export const createSha256Hex = async (value: string): Promise<string> => {
  return bytesToHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(value)));
};

/** 클라이언트가 만든 clientKey 를 서버 비밀키로 감싼 사용자 키. 같은 사람의 재접속을 알아봄. */
export const deriveStableActorKey = async (
  enforcementSecret: string,
  clientKey: string,
): Promise<string> => {
  return createHmacHex(enforcementSecret, `actor\0${clientKey}`);
};

/** IP 대역을 서버 비밀키로 감싼 키. 원본 IP 는 Durable Object 까지 넘기지 않음. */
export const deriveIpGuardKey = async (
  ipGuardSecret: string,
  normalizedIpPrefix: string,
): Promise<string> => {
  return createHmacHex(ipGuardSecret, `ip-guard\0${normalizedIpPrefix}`);
};
