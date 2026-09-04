import { beforeEach, describe, expect, it, vi } from "vitest";

const joseMocks = vi.hoisted(() => ({
  createRemoteJWKSet: vi.fn(() => Symbol("google-json-web-key-set")),
  jwtVerify: vi.fn(),
}));

vi.mock("jose", () => joseMocks);

import { authorizeGoogleAdministrator } from "./googleAdministrator";

const GOOGLE_OAUTH_CLIENT_ID = "client-id.apps.googleusercontent.com";
const ADMINISTRATOR_EMAIL_ALLOWLIST = "admin@gmail.com";

const createAdministratorRequest = (googleIdToken?: string): Request => {
  const headers = googleIdToken ? { Authorization: `Bearer ${googleIdToken}` } : undefined;
  return new Request("https://chat.example.com/v1/admin/chat/session", { headers });
};

describe("authorizeGoogleAdministrator", () => {
  beforeEach(() => {
    joseMocks.jwtVerify.mockReset();
  });

  it("rejects a request without a Google ID token", async () => {
    const authorizationStatus = await authorizeGoogleAdministrator(
      createAdministratorRequest(),
      GOOGLE_OAUTH_CLIENT_ID,
      ADMINISTRATOR_EMAIL_ALLOWLIST,
    );

    expect(authorizationStatus).toBe("unauthenticated");
    expect(joseMocks.jwtVerify).not.toHaveBeenCalled();
  });

  it("rejects a token when Google verification fails", async () => {
    joseMocks.jwtVerify.mockRejectedValue(new Error("invalid token"));

    const authorizationStatus = await authorizeGoogleAdministrator(
      createAdministratorRequest("forged-token"),
      GOOGLE_OAUTH_CLIENT_ID,
      ADMINISTRATOR_EMAIL_ALLOWLIST,
    );

    expect(authorizationStatus).toBe("unauthenticated");
  });

  it("authorizes a verified allowlisted Google account", async () => {
    joseMocks.jwtVerify.mockResolvedValue({
      payload: {
        sub: "google-account-id",
        email: "ADMIN@gmail.com",
        email_verified: true,
      },
    });

    const authorizationStatus = await authorizeGoogleAdministrator(
      createAdministratorRequest("signed-token"),
      GOOGLE_OAUTH_CLIENT_ID,
      ADMINISTRATOR_EMAIL_ALLOWLIST,
    );

    expect(authorizationStatus).toBe("authorized");
    expect(joseMocks.jwtVerify).toHaveBeenCalledWith(
      "signed-token",
      expect.anything(),
      expect.objectContaining({
        algorithms: ["RS256"],
        audience: GOOGLE_OAUTH_CLIENT_ID,
        issuer: ["accounts.google.com", "https://accounts.google.com"],
      }),
    );
  });

  it("forbids a verified account outside the administrator allowlist", async () => {
    joseMocks.jwtVerify.mockResolvedValue({
      payload: {
        sub: "another-google-account-id",
        email: "viewer@gmail.com",
        email_verified: true,
      },
    });

    const authorizationStatus = await authorizeGoogleAdministrator(
      createAdministratorRequest("signed-token"),
      GOOGLE_OAUTH_CLIENT_ID,
      ADMINISTRATOR_EMAIL_ALLOWLIST,
    );

    expect(authorizationStatus).toBe("forbidden");
  });

  it("rejects an unverified email claim", async () => {
    joseMocks.jwtVerify.mockResolvedValue({
      payload: {
        sub: "google-account-id",
        email: "admin@gmail.com",
        email_verified: false,
      },
    });

    const authorizationStatus = await authorizeGoogleAdministrator(
      createAdministratorRequest("signed-token"),
      GOOGLE_OAUTH_CLIENT_ID,
      ADMINISTRATOR_EMAIL_ALLOWLIST,
    );

    expect(authorizationStatus).toBe("unauthenticated");
  });
});
