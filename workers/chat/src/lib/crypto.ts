interface PassTokenPayload {
  v: 1;
  stableActorKey: string;
  issuedAt: number;
  expiresAt: number;
}

const textEncoder = new TextEncoder();

// region [Privates]
const bytesToHex = (bytes: ArrayBuffer): string => {
  return Array.from(new Uint8Array(bytes), (byteValue) =>
    byteValue.toString(16).padStart(2, "0"),
  ).join("");
};

const bytesToBase64Url = (bytes: ArrayBuffer | Uint8Array): string => {
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const binaryValue = Array.from(byteArray, (byteValue) => String.fromCharCode(byteValue)).join("");
  return btoa(binaryValue).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlToString = (value: string): string => {
  const base64Value = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64Value = base64Value.padEnd(Math.ceil(base64Value.length / 4) * 4, "=");
  const binaryValue = atob(paddedBase64Value);
  return new TextDecoder().decode(
    Uint8Array.from(binaryValue, (character) => character.charCodeAt(0)),
  );
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

const hasMatchingSignature = (leftValue: string, rightValue: string): boolean => {
  if (leftValue.length !== rightValue.length) {
    return false;
  }

  let difference = 0;
  for (let characterIndex = 0; characterIndex < leftValue.length; characterIndex += 1) {
    difference |= leftValue.charCodeAt(characterIndex) ^ rightValue.charCodeAt(characterIndex);
  }
  return difference === 0;
};
// endregion

export const createHmacHex = async (secret: string, value: string): Promise<string> => {
  return bytesToHex(await createHmacSignature(secret, value));
};

export const createSha256Hex = async (value: string): Promise<string> => {
  return bytesToHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(value)));
};

export const deriveStableActorKey = async (
  enforcementSecret: string,
  clientKey: string,
): Promise<string> => {
  return createHmacHex(enforcementSecret, `actor\0${clientKey}`);
};

export const deriveDailyActor = async (
  actorSecret: string,
  koreaDate: string,
  stableActorKey: string,
): Promise<{ dailyActorKey: string; anonId: string }> => {
  const dailyActorKey = await createHmacHex(actorSecret, `daily\0${koreaDate}\0${stableActorKey}`);
  return { dailyActorKey, anonId: dailyActorKey.slice(0, 8) };
};

export const deriveSayActorTag = async (
  enforcementSecret: string,
  sayBucket: number,
  stableActorKey: string,
): Promise<string> => {
  const fullActorTag = await createHmacHex(
    enforcementSecret,
    `say\0${sayBucket}\0${stableActorKey}`,
  );
  return fullActorTag.slice(0, 32);
};

export const deriveReactionActorToken = async (
  messageId: string,
  stableActorKey: string,
): Promise<string> => {
  return createSha256Hex(`reaction\0${messageId}\0${stableActorKey}`);
};

export const deriveIpGuardKey = async (
  ipGuardSecret: string,
  normalizedIpPrefix: string,
): Promise<string> => {
  return createHmacHex(ipGuardSecret, `ip-guard\0${normalizedIpPrefix}`);
};

export const issuePassToken = async (
  passSigningSecret: string,
  stableActorKey: string,
  currentTime: number,
): Promise<{ passToken: string; expiresAt: number }> => {
  const expiresAt = currentTime + 24 * 60 * 60 * 1_000;
  const payload: PassTokenPayload = {
    v: 1,
    stableActorKey,
    issuedAt: currentTime,
    expiresAt,
  };
  const encodedPayload = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const encodedSignature = bytesToBase64Url(
    await createHmacSignature(passSigningSecret, encodedPayload),
  );

  return { passToken: `${encodedPayload}.${encodedSignature}`, expiresAt };
};

export const verifyPassToken = async (
  passToken: string | undefined,
  signingSecrets: readonly string[],
  stableActorKey: string,
  currentTime: number,
): Promise<number | null> => {
  if (!passToken || passToken.length > 4096) {
    return null;
  }

  const [encodedPayload, receivedSignature, unexpectedPart] = passToken.split(".");

  if (!encodedPayload || !receivedSignature || unexpectedPart) {
    return null;
  }

  let payload: PassTokenPayload;

  try {
    payload = JSON.parse(base64UrlToString(encodedPayload)) as PassTokenPayload;
  } catch {
    return null;
  }

  if (
    payload.v !== 1 ||
    payload.stableActorKey !== stableActorKey ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= currentTime ||
    payload.expiresAt - payload.issuedAt > 24 * 60 * 60 * 1_000
  ) {
    return null;
  }

  for (const signingSecret of signingSecrets.filter(Boolean)) {
    const expectedSignature = bytesToBase64Url(
      await createHmacSignature(signingSecret, encodedPayload),
    );

    if (hasMatchingSignature(receivedSignature, expectedSignature)) {
      return payload.expiresAt;
    }
  }

  return null;
};

export const getKoreaDate = (currentTime: number): string => {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(currentTime);
  const year = dateParts.find(({ type }) => type === "year")?.value;
  const month = dateParts.find(({ type }) => type === "month")?.value;
  const day = dateParts.find(({ type }) => type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Korea date calculation failed");
  }

  return `${year}-${month}-${day}`;
};

export const getNextKoreaMidnight = (currentTime: number): number => {
  const [year, month, day] = getKoreaDate(currentTime).split("-").map(Number);
  return Date.UTC(year, month - 1, day + 1, -9, 0, 0, 0);
};
