import type ReconnectingWebSocket from "reconnecting-websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BinanceFeed } from "./binanceFeed";

class TestableBinanceFeed extends BinanceFeed {
  consumeMessage(message: unknown): void {
    this.handleParsedMessage(message);
  }

  requestSnapshot(): void {
    this.subscribe({} as ReconnectingWebSocket);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BinanceFeed", () => {
  it("메이커 방향이 boolean이 아니면 체결을 기록하지 않는다", () => {
    const feed = new TestableBinanceFeed();

    feed.consumeMessage({
      e: "aggTrade",
      a: 1,
      p: "100000",
      q: "0.01",
      T: Date.now(),
    });

    expect(feed.drainTrades(10)).toEqual([]);
    expect(feed.getDiagnostics().parseErrorCount).toBe(1);
  });

  it("REST 스냅샷 뒤 첫 연속 diff를 받아야 live가 된다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastUpdateId: 100,
          bids: [["100", "1"]],
          asks: [["101", "1"]],
        }),
      }),
    );

    const feed = new TestableBinanceFeed();
    feed.requestSnapshot();

    await vi.waitFor(() => {
      expect(feed.orderBook.hasBothSides).toBe(true);
    });

    expect(feed.getMetrics(Date.now()).status).toBe("syncing");

    feed.consumeMessage({
      e: "depthUpdate",
      E: Date.now(),
      U: 101,
      u: 101,
      b: [["100", "2"]],
      a: [],
    });

    expect(feed.getMetrics(Date.now()).status).toBe("live");
  });
});
