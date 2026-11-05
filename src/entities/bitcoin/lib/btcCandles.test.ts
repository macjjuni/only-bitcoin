import { describe, expect, it } from "vitest";
import type { BtcCandle } from "../model/market";
import { mergeCandleHistory, mergeLiveCandle, parseBinanceKlineMessage } from "./btcCandles";

const HALF_HOUR = 30 * 60 * 1000;
const START = 1_762_000_000_000;

const createCandle = (index: number, close = 100_000 + index): BtcCandle => ({
  openTime: START + index * HALF_HOUR,
  open: 100_000,
  high: close + 50,
  low: 99_900,
  close,
  quoteVolume: 1_000_000,
});

const history = [createCandle(0), createCandle(1), createCandle(2)];

describe("parseBinanceKlineMessage", () => {
  it("문자열 숫자를 캔들로 바꾼다", () => {
    const message = {
      e: "kline",
      k: {
        t: START,
        o: "100000.1",
        h: "100500",
        l: "99800",
        c: "100200.5",
        q: "123456.7",
        x: false,
      },
    };

    expect(parseBinanceKlineMessage(message)).toEqual({
      openTime: START,
      open: 100_000.1,
      high: 100_500,
      low: 99_800,
      close: 100_200.5,
      quoteVolume: 123_456.7,
    });
  });

  it("kline 이 아니거나 값이 깨졌으면 null 이다", () => {
    expect(parseBinanceKlineMessage({ e: "24hrTicker", c: "1" })).toBeNull();
    expect(parseBinanceKlineMessage(null)).toBeNull();
    expect(
      parseBinanceKlineMessage({ k: { t: START, o: "x", h: "1", l: "1", c: "1", q: "1" } }),
    ).toBeNull();
  });
});

describe("mergeLiveCandle", () => {
  it("같은 봉이면 마지막 봉을 덮어쓴다", () => {
    const merged = mergeLiveCandle(history, createCandle(2, 101_000), 3);

    expect(merged).toHaveLength(3);
    expect(merged.at(-1)?.close).toBe(101_000);
  });

  it("새 봉이면 뒤에 붙이고 개수를 유지한다", () => {
    const merged = mergeLiveCandle(history, createCandle(3), 3);

    expect(merged.map((candle) => candle.openTime)).toEqual([
      START + HALF_HOUR,
      START + 2 * HALF_HOUR,
      START + 3 * HALF_HOUR,
    ]);
  });

  it("늦게 도착한 지난 봉은 버린다", () => {
    expect(mergeLiveCandle(history, createCandle(1, 1), 3)).toEqual(history);
  });

  it("목록이 비어 있으면 그 봉 하나로 시작한다", () => {
    expect(mergeLiveCandle([], createCandle(0), 3)).toEqual([createCandle(0)]);
  });
});

describe("mergeCandleHistory", () => {
  it("REST 응답보다 최신인 소켓 봉을 살린다", () => {
    const merged = mergeCandleHistory(history, createCandle(2, 105_000), 3);

    expect(merged.at(-1)?.close).toBe(105_000);
  });

  it("소켓 봉이 없으면 개수만 맞춘다", () => {
    expect(mergeCandleHistory(history, null, 2)).toEqual(history.slice(-2));
  });
});
