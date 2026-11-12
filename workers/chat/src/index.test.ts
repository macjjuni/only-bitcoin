import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ DurableObject: class {} }));

import worker from "./index";
import type { ChatWorkerEnv } from "./types";

const createIngress = (isRateAllowed = true, envOverrides: Record<string, string> = {}) => {
  const spaceFetch = vi.fn(async (_request: Request) => new Response("space"));
  const rateLimit = vi.fn(async (_input: { key: string }) => ({ success: isRateAllowed }));
  const env = {
    CHAT_ALLOWED_ORIGINS: "https://www.only-btc.app",
    IP_GUARD_SECRET: "test-ip-guard-secret",
    CHAT_UPGRADE_RATE_LIMITER: { limit: rateLimit },
    SPACE_ROOM: { idFromName: () => "space-main", get: () => ({ fetch: spaceFetch }) },
    ...envOverrides,
  } as unknown as ChatWorkerEnv;
  const request = (path: string, headerOverrides: Record<string, string> = {}) =>
    new Request(`https://worker.test${path}`, {
      headers: {
        Origin: "https://www.only-btc.app",
        Upgrade: "websocket",
        "CF-Connecting-IP": "203.0.113.1",
        "X-Chat-IP-Guard-Key": "untrusted-client-value",
        ...headerOverrides,
      },
    });
  const fetch = (incomingRequest: Request) => worker.fetch(incomingRequest, env);

  return { spaceFetch, rateLimit, request, fetch };
};

describe("space WebSocket ingress", () => {
  it("space 경로만 SpaceRoom 으로 보내고 걷어낸 chat 경로는 404 로 끝낸다", async () => {
    const ingress = createIngress();
    const chatResponse = await ingress.fetch(ingress.request("/v1/chat/ws"));
    const spaceResponse = await ingress.fetch(ingress.request("/v1/space/ws"));

    expect(chatResponse.status).toBe(404);
    expect(await spaceResponse.text()).toBe("space");
    expect(ingress.spaceFetch).toHaveBeenCalledOnce();
    expect(ingress.rateLimit).toHaveBeenCalledOnce();
    expect(ingress.rateLimit.mock.calls[0][0].key).toMatch(/:\/v1\/space\/ws$/);
  });

  it("Origin과 업그레이드/IP 검증에 실패한 요청은 Durable Object까지 보내지 않는다", async () => {
    const ingress = createIngress();
    const forbidden = await ingress.fetch(
      ingress.request("/v1/space/ws", { Origin: "https://other.test" }),
    );
    const notUpgraded = await ingress.fetch(ingress.request("/v1/space/ws", { Upgrade: "" }));
    const missingIp = await ingress.fetch(
      ingress.request("/v1/space/ws", { "CF-Connecting-IP": "" }),
    );

    expect(forbidden.status).toBe(403);
    expect(notUpgraded.status).toBe(426);
    expect(missingIp.status).toBe(403);
    expect(ingress.spaceFetch).not.toHaveBeenCalled();
    expect(ingress.rateLimit).not.toHaveBeenCalled();
  });

  it("로컬 개발 설정이 켜져 있을 때만 IP 헤더 없는 요청을 루프백으로 받음", async () => {
    // wrangler dev 는 CF-Connecting-IP 를 안 붙임. 운영에서는 이 설정이 없음.
    const local = createIngress(true, { SPACE_DISABLE_IP_CONNECTION_LIMIT: "true" });
    const response = await local.fetch(local.request("/v1/space/ws", { "CF-Connecting-IP": "" }));

    expect(await response.text()).toBe("space");
    expect(local.spaceFetch).toHaveBeenCalledOnce();
  });

  it("30/min IP upgrade 제한을 통과하지 못하면 101로 받은 뒤 4010으로 닫는다", async () => {
    const serverSocket = { accept: vi.fn(), close: vi.fn() };
    const clientSocket = { side: "client" };
    vi.stubGlobal("WebSocketPair", function WebSocketPairStub() {
      return { 0: clientSocket, 1: serverSocket };
    });
    // Node 의 Response 는 101 을 만들지 못한다. 핸드셰이크 응답만 가짜로 받는다.
    const NativeResponse = Response;
    vi.stubGlobal(
      "Response",
      function ResponseStub(body: BodyInit | null, init: ResponseInit & { webSocket?: unknown }) {
        return init?.status === 101
          ? { status: 101, webSocket: init.webSocket }
          : new NativeResponse(body, init);
      },
    );

    const ingress = createIngress(false);
    const response = await ingress.fetch(ingress.request("/v1/space/ws"));

    expect(response.status).toBe(101);
    expect(response.webSocket).toBe(clientSocket);
    expect(serverSocket.accept).toHaveBeenCalledOnce();
    expect(serverSocket.close).toHaveBeenCalledWith(4010, "upgrade rate limit");
    expect(ingress.spaceFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("원본 IP와 위조 guard 헤더를 제거하고 서버에서 만든 guard만 전달한다", async () => {
    const ingress = createIngress();
    await ingress.fetch(ingress.request("/v1/space/ws"));
    const forwarded = ingress.spaceFetch.mock.calls[0][0];

    expect(forwarded.headers.has("CF-Connecting-IP")).toBe(false);
    expect(forwarded.headers.get("X-Chat-IP-Guard-Key")).toMatch(/^[a-f0-9]{64}$/);
    expect(forwarded.headers.get("X-Chat-IP-Guard-Key")).not.toBe("untrusted-client-value");
  });
});

describe("space presence", () => {
  it("인원수를 10초 캐시하고 방 조회 실패는 503 으로 알리며 Origin 을 검증한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T00:00:00Z"));
    const ingress = createIngress();
    const presenceRequest = () => ingress.request("/v1/space/presence", { Upgrade: "" });

    const forbidden = await ingress.fetch(
      ingress.request("/v1/space/presence", { Origin: "https://other.test", Upgrade: "" }),
    );
    expect(forbidden.status).toBe(403);
    expect(ingress.spaceFetch).not.toHaveBeenCalled();

    // 방이 이상한 값을 주면 숫자를 지어내지 않고, 실패는 캐시하지 않음.
    const failed = await ingress.fetch(presenceRequest());
    expect(failed.status).toBe(503);

    ingress.spaceFetch.mockImplementation(async () => Response.json({ count: 3 }));
    const first = await ingress.fetch(presenceRequest());
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ count: 3 });
    expect(first.headers.get("Access-Control-Allow-Origin")).toBe("https://www.only-btc.app");
    expect(first.headers.get("Cache-Control")).toBe("public, max-age=10");
    expect(ingress.rateLimit).not.toHaveBeenCalled();

    ingress.spaceFetch.mockImplementation(async () => Response.json({ count: 5 }));
    const cached = await ingress.fetch(presenceRequest());
    expect(await cached.json()).toEqual({ count: 3 });
    expect(ingress.spaceFetch).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10_000);
    const refreshed = await ingress.fetch(presenceRequest());
    expect(await refreshed.json()).toEqual({ count: 5 });
    expect(ingress.spaceFetch).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
