import { describe, expect, it } from "vitest";
import { UpbitFeed } from "./upbitFeed";

class TestableUpbitFeed extends UpbitFeed {
  consumeMessage(rawText: string): void {
    this.handleParsedMessage(JSON.parse(rawText), rawText);
  }
}

describe("UpbitFeed", () => {
  it("JavaScript 안전 정수 범위를 넘는 인접 체결 ID를 구분한다", () => {
    const feed = new TestableUpbitFeed();
    const firstRawMessage =
      '{"type":"trade","code":"KRW-BTC","trade_price":106000000,"trade_volume":0.001,"trade_timestamp":1788327160091,"ask_bid":"BID","sequential_id":17883271600910000}';
    const secondRawMessage =
      '{"type":"trade","code":"KRW-BTC","trade_price":106000000,"trade_volume":0.002,"trade_timestamp":1788327160091,"ask_bid":"ASK","sequential_id":17883271600910001}';

    feed.consumeMessage(firstRawMessage);
    feed.consumeMessage(secondRawMessage);

    expect(feed.drainTrades(10).map((trade) => trade.tradeID)).toEqual([
      "upbit-17883271600910000",
      "upbit-17883271600910001",
    ]);
  });
});
