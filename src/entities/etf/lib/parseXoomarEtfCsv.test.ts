import { describe, expect, it } from "vitest";
import { parseXoomarBitcoinEtfCsv } from "./parseXoomarEtfCsv";

describe("parseXoomarBitcoinEtfCsv", () => {
  it("BTC 행만 추출하고 빈 수치는 null로 정규화한다", () => {
    const csvText = [
      "date,ticker,issuer,asset,holdings,flow_usd,aum_usd",
      '2026-08-26,BITB,"Bitwise, Inc.",btc,37947.94,2993820.19,2990739636.76',
      "2026-08-26,ETHW,Bitwise,eth,109995.14,0.00,275635744.21",
      "2026-08-25,IBIT,BlackRock,btc,,,",
    ].join("\n");

    expect(parseXoomarBitcoinEtfCsv(csvText)).toEqual([
      {
        date: "2026-08-26",
        ticker: "BITB",
        issuer: "Bitwise, Inc.",
        asset: "btc",
        holdings: "37947.94",
        flowUsd: "2993820.19",
        aumUsd: "2990739636.76",
      },
      {
        date: "2026-08-25",
        ticker: "IBIT",
        issuer: "BlackRock",
        asset: "btc",
        holdings: null,
        flowUsd: null,
        aumUsd: null,
      },
    ]);
  });

  it("예상하지 못한 헤더는 조용히 저장하지 않는다", () => {
    expect(() => parseXoomarBitcoinEtfCsv("date,ticker\n2026-08-26,BITB")).toThrow(
      "Xoomar ETF CSV 헤더 형식이 예상과 다릅니다.",
    );
  });
});
