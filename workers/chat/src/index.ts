import { SPACE_CLOSE_CODES } from "../../../src/entities/space/model/spaceProtocol";
import { deriveIpGuardKey } from "./lib/crypto";
import { SpaceRoom } from "./SpaceRoom";
import type { ChatWorkerEnv } from "./types";

export { SpaceRoom };

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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
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

/**
 * 업그레이드 한도를 넘긴 연결을 닫는 코드.
 *
 * 핸드셰이크 단계의 429와 `Retry-After` 는 브라우저가 JS 에 전달하지 않는다.
 * 클라이언트는 그냥 "연결 실패" 로 보고 1초 뒤에 다시 올라오고, 리미터는 거절한
 * 요청도 창에 쌓으므로 락아웃이 스스로 길어진다. 101 로 받은 뒤 전용 코드로
 * 닫으면 사유가 `CloseEvent.code` 로 전달되어 클라이언트가 대기로 전환할 수 있다.
 */
const RATE_LIMIT_CLOSE_CODE = SPACE_CLOSE_CODES.upgradeRateLimit;

/** 핸드셰이크는 성공시키고 즉시 닫아 거절 사유만 전달한다. 방까지 올려보내지 않는다. */
const createRateLimitedSocketResponse = (): Response => {
  const pair = new WebSocketPair();
  pair[1].accept();
  pair[1].close(RATE_LIMIT_CLOSE_CODE, "upgrade rate limit");

  return new Response(null, { status: 101, webSocket: pair[0] });
};

/**
 * 접속자 IP. 운영에서는 Cloudflare 가 늘 `CF-Connecting-IP` 를 붙여 줌.
 *
 * 로컬 `wrangler dev` 는 이 헤더를 안 붙여서 모든 접속이 `IP_UNAVAILABLE` 로 막혔음.
 * `pnpm chat:dev` 가 넣는 로컬 전용 설정(`SPACE_DISABLE_IP_CONNECTION_LIMIT`)이 켜져
 * 있을 때만 루프백으로 봄. 운영에서는 이 값이 없어 헤더 없는 요청은 그대로 거절함.
 */
const resolveConnectingIpAddress = (request: Request, workerEnv: ChatWorkerEnv): string | null => {
  const headerIpAddress = request.headers.get("CF-Connecting-IP");

  if (headerIpAddress) {
    return headerIpAddress;
  }

  return workerEnv.SPACE_DISABLE_IP_CONNECTION_LIMIT === "true" ? "127.0.0.1" : null;
};

const handleSpaceWebSocketUpgrade = async (
  request: Request,
  workerEnv: ChatWorkerEnv,
): Promise<Response> => {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return jsonResponse({ error: "UPGRADE_REQUIRED" }, 426, { Upgrade: "websocket" });
  }

  const connectingIpAddress = resolveConnectingIpAddress(request, workerEnv);
  if (!connectingIpAddress) {
    return jsonResponse({ error: "IP_UNAVAILABLE" }, 403);
  }

  const normalizedIpPrefix = normalizeIpGuardPrefix(connectingIpAddress);
  const ipGuardKey = await deriveIpGuardKey(workerEnv.IP_GUARD_SECRET, normalizedIpPrefix);
  const rateLimitResult = await workerEnv.CHAT_UPGRADE_RATE_LIMITER.limit({
    key: `${ipGuardKey}:/v1/space/ws`,
  });

  if (!rateLimitResult.success) {
    return createRateLimitedSocketResponse();
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("X-Chat-IP-Guard-Key", ipGuardKey);
  forwardedHeaders.delete("CF-Connecting-IP");
  const forwardedRequest = new Request(request, { headers: forwardedHeaders });
  const spaceRoomStub = workerEnv.SPACE_ROOM.get(workerEnv.SPACE_ROOM.idFromName("main"), {
    locationHint: "apac-ne",
  });

  return spaceRoomStub.fetch(forwardedRequest);
};

/**
 * 인원수 응답을 붙들어 두는 시간.
 *
 * 플로팅 버튼이 여러 페이지에 떠서 방문자마다 방을 깨우면 비용이 늘어남.
 * isolate 메모리에 잠깐 두고 브라우저에도 같은 시간만큼 캐시하게 함.
 * workers.dev 주소에서는 Cache API 가 동작하지 않아 메모리를 씀.
 */
const PRESENCE_CACHE_MS = 10_000;
let cachedPresence: { count: number; expiresAt: number } | null = null;

/** 방에 묻는 데 실패하면 숫자를 지어내지 않고 503 을 돌려줌. */
const handleSpacePresence = async (
  workerEnv: ChatWorkerEnv,
  corsHeaders: Headers,
): Promise<Response> => {
  const now = Date.now();

  if (!cachedPresence || cachedPresence.expiresAt <= now) {
    try {
      const spaceRoomStub = workerEnv.SPACE_ROOM.get(workerEnv.SPACE_ROOM.idFromName("main"), {
        locationHint: "apac-ne",
      });
      const roomResponse = await spaceRoomStub.fetch("https://space-room/v1/space/presence");
      const payload: { count?: unknown } = await roomResponse.json();

      if (!roomResponse.ok || !Number.isInteger(payload.count) || Number(payload.count) < 0) {
        throw new Error("Invalid presence response");
      }
      cachedPresence = { count: Number(payload.count), expiresAt: now + PRESENCE_CACHE_MS };
    } catch {
      return jsonResponse({ error: "UNAVAILABLE" }, 503, corsHeaders);
    }
  }
  corsHeaders.set("Cache-Control", `public, max-age=${PRESENCE_CACHE_MS / 1000}`);

  return jsonResponse({ count: cachedPresence.count }, 200, corsHeaders);
};
// endregion

export default {
  async fetch(request: Request, workerEnv: ChatWorkerEnv): Promise<Response> {
    const allowedOrigin = getAllowedOrigin(request, workerEnv);

    if (!allowedOrigin) {
      return jsonResponse({ error: "ORIGIN_NOT_ALLOWED" }, 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: createCorsHeaders(allowedOrigin) });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/v1/space/ws" && request.method === "GET") {
      return handleSpaceWebSocketUpgrade(request, workerEnv);
    }
    if (requestUrl.pathname === "/v1/space/presence" && request.method === "GET") {
      return handleSpacePresence(workerEnv, createCorsHeaders(allowedOrigin));
    }

    return jsonResponse({ error: "NOT_FOUND" }, 404, createCorsHeaders(allowedOrigin));
  },
} satisfies ExportedHandler<ChatWorkerEnv>;
