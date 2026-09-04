import { ChatRoom } from "./ChatRoom";
import { deriveIpGuardKey } from "./lib/crypto";
import { authorizeGoogleAdministrator } from "./lib/googleAdministrator";
import type { ChatWorkerEnv } from "./types";

export { ChatRoom };

// region [Privates]
const jsonResponse = (payload: unknown, status: number, headers?: HeadersInit): Response => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders,
  });
};

const getAllowedOrigin = (request: Request, workerEnv: ChatWorkerEnv): string | null => {
  const requestOrigin = request.headers.get("Origin");
  const allowedOrigins = workerEnv.CHAT_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
};

const createCorsHeaders = (allowedOrigin: string): Headers => {
  return new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
};

const attachCorsHeaders = (response: Response, allowedOrigin: string): Response => {
  const responseHeaders = new Headers(response.headers);
  const corsHeaders = createCorsHeaders(allowedOrigin);
  corsHeaders.forEach((headerValue, headerName) => {
    responseHeaders.set(headerName, headerValue);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

const expandIpv6Address = (ipAddress: string): string[] => {
  const addressWithoutZone = ipAddress.split("%")[0];
  const [leftSide, rightSide = ""] = addressWithoutZone.split("::");
  const leftGroups = leftSide ? leftSide.split(":") : [];
  const rightGroups = rightSide ? rightSide.split(":") : [];
  const missingGroupCount = Math.max(0, 8 - leftGroups.length - rightGroups.length);

  return [
    ...leftGroups,
    ...Array.from({ length: missingGroupCount }, () => "0"),
    ...rightGroups,
  ].map((group) => group.padStart(4, "0").toLowerCase());
};

const normalizeIpGuardPrefix = (ipAddress: string): string => {
  if (!ipAddress.includes(":")) {
    return ipAddress;
  }

  return `${expandIpv6Address(ipAddress).slice(0, 4).join(":")}::/64`;
};

const getChatRoomStub = (workerEnv: ChatWorkerEnv): DurableObjectStub => {
  const durableObjectId = workerEnv.CHAT_ROOM.idFromName("main");
  return workerEnv.CHAT_ROOM.get(durableObjectId, { locationHint: "apac-ne" });
};

const forwardHttpRequest = async (
  request: Request,
  workerEnv: ChatWorkerEnv,
  allowedOrigin: string,
): Promise<Response> => {
  const durableObjectResponse = await getChatRoomStub(workerEnv).fetch(request);
  return attachCorsHeaders(durableObjectResponse, allowedOrigin);
};

const handleOnlineRequest = async (
  request: Request,
  workerEnv: ChatWorkerEnv,
  executionContext: ExecutionContext,
  allowedOrigin: string,
): Promise<Response> => {
  const cacheKey = new Request(
    `https://only-bitcoin-chat-cache.invalid/v1/chat/online/${encodeURIComponent(allowedOrigin)}`,
    { method: "GET" },
  );
  const cachedResponse = await caches.default.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const durableObjectResponse = await getChatRoomStub(workerEnv).fetch(request);
    const responseHeaders = createCorsHeaders(allowedOrigin);
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
    responseHeaders.set("Cache-Control", "public, s-maxage=15");
    const onlineResponse = new Response(durableObjectResponse.body, {
      status: durableObjectResponse.status,
      headers: responseHeaders,
    });

    if (onlineResponse.ok) {
      executionContext.waitUntil(caches.default.put(cacheKey, onlineResponse.clone()));
    }

    return onlineResponse;
  } catch {
    return jsonResponse({ error: "ONLINE_UNAVAILABLE" }, 503, createCorsHeaders(allowedOrigin));
  }
};

const handleWebSocketUpgrade = async (
  request: Request,
  workerEnv: ChatWorkerEnv,
): Promise<Response> => {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return jsonResponse({ error: "UPGRADE_REQUIRED" }, 426, { Upgrade: "websocket" });
  }

  const connectingIpAddress = request.headers.get("CF-Connecting-IP");
  if (!connectingIpAddress) {
    return jsonResponse({ error: "IP_UNAVAILABLE" }, 403);
  }

  const normalizedIpPrefix = normalizeIpGuardPrefix(connectingIpAddress);
  const ipGuardKey = await deriveIpGuardKey(workerEnv.IP_GUARD_SECRET, normalizedIpPrefix);
  const rateLimitResult = await workerEnv.CHAT_UPGRADE_RATE_LIMITER.limit({
    key: `${ipGuardKey}:/v1/chat/ws`,
  });

  if (!rateLimitResult.success) {
    return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("X-Chat-IP-Guard-Key", ipGuardKey);
  forwardedHeaders.delete("CF-Connecting-IP");
  const forwardedRequest = new Request(request, { headers: forwardedHeaders });

  return getChatRoomStub(workerEnv).fetch(forwardedRequest);
};

const handleAdminRequest = async (
  request: Request,
  workerEnv: ChatWorkerEnv,
  allowedOrigin: string,
): Promise<Response> => {
  const authorizationStatus = await authorizeGoogleAdministrator(
    request,
    workerEnv.GOOGLE_OAUTH_CLIENT_ID,
    workerEnv.ADMIN_EMAIL_ALLOWLIST,
  );

  if (authorizationStatus === "unauthenticated") {
    return jsonResponse({ error: "UNAUTHORIZED" }, 401, createCorsHeaders(allowedOrigin));
  }
  if (authorizationStatus === "forbidden") {
    return jsonResponse({ error: "FORBIDDEN" }, 403, createCorsHeaders(allowedOrigin));
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.pathname === "/v1/admin/chat/session" && request.method === "POST") {
    const responseHeaders = createCorsHeaders(allowedOrigin);
    responseHeaders.set("Cache-Control", "no-store");
    return jsonResponse({ isAdministrator: true }, 200, responseHeaders);
  }
  if (
    request.method === "POST" &&
    !request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")
  ) {
    return jsonResponse(
      { error: "JSON_CONTENT_TYPE_REQUIRED" },
      415,
      createCorsHeaders(allowedOrigin),
    );
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete("Authorization");
  const forwardedRequest = new Request(request, { headers: forwardedHeaders });
  return forwardHttpRequest(forwardedRequest, workerEnv, allowedOrigin);
};
// endregion

export default {
  async fetch(
    request: Request,
    workerEnv: ChatWorkerEnv,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    const allowedOrigin = getAllowedOrigin(request, workerEnv);

    if (!allowedOrigin) {
      return jsonResponse({ error: "ORIGIN_NOT_ALLOWED" }, 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: createCorsHeaders(allowedOrigin) });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/v1/chat/ws" && request.method === "GET") {
      return handleWebSocketUpgrade(request, workerEnv);
    }
    if (requestUrl.pathname === "/v1/chat/online" && request.method === "GET") {
      return handleOnlineRequest(request, workerEnv, executionContext, allowedOrigin);
    }
    if (requestUrl.pathname === "/v1/chat/health" && request.method === "GET") {
      return forwardHttpRequest(request, workerEnv, allowedOrigin);
    }
    if (requestUrl.pathname.startsWith("/v1/admin/chat/")) {
      return handleAdminRequest(request, workerEnv, allowedOrigin);
    }

    return jsonResponse({ error: "NOT_FOUND" }, 404, createCorsHeaders(allowedOrigin));
  },
} satisfies ExportedHandler<ChatWorkerEnv>;
