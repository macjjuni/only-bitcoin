import type ReconnectingWebSocket from "reconnecting-websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TradeSide } from "../model/types";
import { VenueFeedBase } from "./venueFeedBase";

class TestVenueFeed extends VenueFeedBase {
  constructor() {
    super("binance");
  }

  protected getStreamUrl(): string {
    return "wss://example.com";
  }

  protected subscribe(_socket: ReconnectingWebSocket): void {}

  protected handleParsedMessage(_message: unknown, _rawText: string): void {}

  protected resetSyncState(): void {}

  synchronizeOrderBook(sourceTimestampInMs: number): void {
    this.markSyncing();
    this.orderBook.bids.replaceAll([[100, 1]]);
    this.orderBook.asks.replaceAll([[101, 1]]);
    this.markOrderBookReceived(sourceTimestampInMs);
    this.markSynchronized();
  }

  attemptSynchronizationWithoutOrderBook(): void {
    this.markSyncing();
    this.markSynchronized();
  }

  receiveHeartbeat(sourceTimestampInMs: number): void {
    this.markHeartbeatReceived(sourceTimestampInMs);
  }

  receiveTrade(sourceTimestampInMs: number, aggressorSide: TradeSide = "buy"): void {
    this.markTradeReceived(sourceTimestampInMs);
    this.recordTrade({
      tradeID: `test-${sourceTimestampInMs}`,
      sourceTimestampInMs,
      priceInQuote: 100,
      sizeInBtc: 1,
      aggressorSide,
    });
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("VenueFeedBase", () => {
  it("하트비트가 계속 와도 오래된 오더북은 stale로 판단한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);

    const feed = new TestVenueFeed();
    feed.synchronizeOrderBook(Date.now());

    vi.advanceTimersByTime(6_001);
    feed.receiveHeartbeat(Date.now());

    const metrics = feed.getMetrics(Date.now());

    expect(metrics.status).toBe("stale");
    expect(metrics.lastMessageAtInMs).toBe(Date.now());
    expect(metrics.lastOrderBookAtInMs).toBe(100_000);
  });

  it("체결 집계 창은 거래소 시각이 아니라 로컬 수신 시각을 사용한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);

    const feed = new TestVenueFeed();
    feed.synchronizeOrderBook(Date.now());
    feed.receiveTrade(10_000);
    feed.refreshDerived(Date.now());

    expect(feed.getMetrics(Date.now()).buyVolumeInBtc).toBe(1);

    vi.advanceTimersByTime(4_999);
    feed.refreshDerived(Date.now());

    expect(feed.getMetrics(Date.now()).buyVolumeInBtc).toBe(1);

    vi.advanceTimersByTime(2);
    feed.refreshDerived(Date.now());

    expect(feed.getMetrics(Date.now()).buyVolumeInBtc).toBe(0);
  });

  it("양쪽 호가가 없으면 동기화 완료로 전환하지 않는다", () => {
    const feed = new TestVenueFeed();

    feed.attemptSynchronizationWithoutOrderBook();

    expect(feed.getMetrics(Date.now()).status).toBe("syncing");
  });
});
