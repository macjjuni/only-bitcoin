import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JSON_WEB_KEY_SET = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  {
    timeoutDuration: 5_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 60 * 60 * 1_000,
  },
);
const GOOGLE_TOKEN_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const MAXIMUM_GOOGLE_ID_TOKEN_LENGTH = 8_192;

export type AdministratorAuthorizationStatus = "authorized" | "forbidden" | "unauthenticated";

// region [Privates]
const getBearerToken = (request: Request): string | null => {
  const authorizationHeader = request.headers.get("Authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const bearerToken = authorizationHeader.slice("Bearer ".length).trim();
  return bearerToken && bearerToken.length <= MAXIMUM_GOOGLE_ID_TOKEN_LENGTH ? bearerToken : null;
};

const getAdministratorEmailAllowlist = (emailAllowlist: string): string[] => {
  return (emailAllowlist ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const isGoogleAuthoritativeEmail = (email: string, hostedDomain: unknown): boolean => {
  return email.endsWith("@gmail.com") || typeof hostedDomain === "string";
};
// endregion

/** Google ID 토큰을 검증하고 관리자 이메일 허용 목록까지 확인한다. */
export const authorizeGoogleAdministrator = async (
  request: Request,
  googleOAuthClientId: string,
  administratorEmailAllowlist: string,
): Promise<AdministratorAuthorizationStatus> => {
  const googleIdToken = getBearerToken(request);
  const normalizedGoogleOAuthClientId = googleOAuthClientId?.trim() ?? "";

  if (!googleIdToken || !normalizedGoogleOAuthClientId) {
    return "unauthenticated";
  }

  try {
    const { payload } = await jwtVerify(googleIdToken, GOOGLE_JSON_WEB_KEY_SET, {
      algorithms: ["RS256"],
      audience: normalizedGoogleOAuthClientId,
      issuer: GOOGLE_TOKEN_ISSUERS,
    });
    const administratorEmail = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    const isEmailVerified = payload.email_verified === true;
    const hasValidGoogleSubject = typeof payload.sub === "string" && payload.sub.length > 0;

    if (
      !administratorEmail ||
      !isEmailVerified ||
      !hasValidGoogleSubject ||
      !isGoogleAuthoritativeEmail(administratorEmail, payload.hd)
    ) {
      return "unauthenticated";
    }

    return getAdministratorEmailAllowlist(administratorEmailAllowlist).includes(administratorEmail)
      ? "authorized"
      : "forbidden";
  } catch {
    return "unauthenticated";
  }
};
