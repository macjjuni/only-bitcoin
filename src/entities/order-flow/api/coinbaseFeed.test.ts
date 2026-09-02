import { describe, expect, it } from "vitest";
import { CoinbaseFeed } from "./coinbaseFeed";

class TestableCoinbaseFeed extends CoinbaseFeed {
  consumeMessage(message: unknown): void {
    this.handleParsedMessage(message);
  }
}

function createTradeEvent(type: "snapshot" | "update", tradeID: string) {
  return {
    type,
    trades: [
      {
        trade_id: tradeID,
        product_id: "BTC-USD",
        price: "77000",
        size: "0.01",
        side: "SELL",
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
});
