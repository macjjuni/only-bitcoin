import { describe, expect, it } from "vitest";
import { CoinbaseFeed } from "./coinbaseFeed";

class TestableCoinbaseFeed extends CoinbaseFeed {
  consumeMessage(message: unknown): void {
    this.handleParsedMessage(message);
  }

  beginSynchronization(): void {
    this.markSyncing();
  }
}

function createTradeEvent(
  type: "snapshot" | "update",
  tradeID: string,
  makerSide: "BUY" | "SELL" | "UNKNOWN" = "SELL",
) {
  return {
    type,
    trades: [
      {
        trade_id: tradeID,
        product_id: "BTC-USD",
        price: "77000",
        size: "0.01",
        side: makerSide,
        time: "2026-09-02T05:29:30.832525Z",
      },
    ],
  };
}

describe("CoinbaseFeed", () => {
  it("최초 과거 체결 snapshot은 버리고 실시간 update만 기록한다", () => {
    const feed = new TestableCoinbaseFeed();

    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 0,
      events: [createTradeEvent("snapshot", "old-trade")],
    });
    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 1,
      events: [createTradeEvent("update", "live-trade")],
    });

    expect(feed.drainTrades(10).map((trade) => trade.tradeID)).toEqual(["coinbase-live-trade"]);
  });

  it("알 수 없는 메이커 방향은 체결로 기록하지 않는다", () => {
    const feed = new TestableCoinbaseFeed();

    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 0,
      events: [createTradeEvent("update", "invalid-side", "UNKNOWN")],
    });

    expect(feed.drainTrades(10)).toEqual([]);
    expect(feed.getDiagnostics().parseErrorCount).toBe(1);
  });

  it("역행한 sequence는 무시하고 다음 연속 메시지를 처리한다", () => {
    const feed = new TestableCoinbaseFeed();

    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 0,
      events: [createTradeEvent("snapshot", "snapshot")],
    });
    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 1,
      events: [createTradeEvent("update", "first-live")],
    });
    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 0,
      events: [createTradeEvent("update", "out-of-order")],
    });
    feed.consumeMessage({
      channel: "market_trades",
      sequence_num: 2,
      events: [createTradeEvent("update", "second-live")],
    });

    expect(feed.drainTrades(10).map((trade) => trade.tradeID)).toEqual([
      "coinbase-first-live",
      "coinbase-second-live",
    ]);
    expect(feed.getDiagnostics().sequenceGapCount).toBe(0);
  });

  it("양쪽 호가가 없는 snapshot은 동기화 완료로 인정하지 않는다", () => {
    const feed = new TestableCoinbaseFeed();
    feed.beginSynchronization();

    feed.consumeMessage({
      channel: "l2_data",
      sequence_num: 0,
      events: [
        {
          type: "snapshot",
          product_id: "BTC-USD",
          updates: [{ side: "bid", price_level: "77000", new_quantity: "1" }],
        },
      ],
    });

    expect(feed.orderBook.hasBothSides).toBe(false);
    expect(feed.getMetrics(Date.now()).status).toBe("syncing");
    expect(feed.getDiagnostics().parseErrorCount).toBe(1);
  });
});
