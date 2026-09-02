import { describe, expect, it } from "vitest";
import { IMBALANCE_LEVEL_COUNT } from "../model/constants";
import { OrderBook } from "./orderBook";

describe("OrderBook", () => {
  it("거래소마다 공통 상위 호가 단계만 불균형 계산에 사용한다", () => {
    const orderBook = new OrderBook();

    for (let levelIndex = 0; levelIndex < IMBALANCE_LEVEL_COUNT; levelIndex += 1) {
      orderBook.bids.applyLevel(100 - levelIndex, 1);
      orderBook.asks.applyLevel(101 + levelIndex, 1);
    }

    orderBook.bids.applyLevel(1, 1_000);

    expect(orderBook.getComparableDepthSizesInBtc()).toEqual({
      bidSizeInBtc: IMBALANCE_LEVEL_COUNT,
      askSizeInBtc: IMBALANCE_LEVEL_COUNT,
    });
    expect(orderBook.getBookImbalance()).toBeCloseTo(0);
  });
});
