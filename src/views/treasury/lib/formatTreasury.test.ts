import { describe, expect, it } from "vitest";
import {
  convertCountryCodeToFlagEmoji,
  extractTickerCode,
  formatBtcAmount,
  formatBtcCount,
  formatKstDateTime,
  formatPercent,
  formatSignedPercent,
  formatSignedUsdCompact,
  formatUsdCompact,
  formatUsdPrice,
} from "./formatTreasury";

describe("formatUsdCompact", () => {
  it("한국어 큰 수 단위로 축약한다", () => {
    expect(formatUsdCompact(1_234_000_000_000)).toBe("1.2조 달러");
    expect(formatUsdCompact(60_530_000_000)).toBe("605.3억 달러");
    expect(formatUsdCompact(12_340_000)).toBe("1,234만 달러");
  });

  it("음수는 앞에 부호를 붙인다", () => {
    expect(formatUsdCompact(-60_530_000_000)).toBe("-605.3억 달러");
  });

  it("0 과 유효하지 않은 값은 하이픈으로 처리한다", () => {
    expect(formatUsdCompact(0)).toBe("-");
    expect(formatUsdCompact(Number.NaN)).toBe("-");
  });
});

describe("formatSignedUsdCompact", () => {
  it("이익은 + 를, 손실은 - 를 붙인다", () => {
    expect(formatSignedUsdCompact(60_530_000_000)).toBe("+605.3억 달러");
    expect(formatSignedUsdCompact(-60_530_000_000)).toBe("-605.3억 달러");
  });
});

describe("formatUsdPrice", () => {
  it("평단가는 축약하지 않고 천 단위 구분자로 표기한다", () => {
    expect(formatUsdPrice(45_231.7)).toBe("$45,232");
  });

  it("매입 데이터가 없으면 하이픈으로 처리한다", () => {
    expect(formatUsdPrice(0)).toBe("-");
    expect(formatUsdPrice(Number.NaN)).toBe("-");
  });
});

describe("formatBtcAmount", () => {
  it("정수 BTC 로 표기한다", () => {
    expect(formatBtcAmount(632_457.4)).toBe("632,457 BTC");
  });

  it("보유량이 없으면 0 BTC 로 처리한다", () => {
    expect(formatBtcAmount(0)).toBe("0 BTC");
    expect(formatBtcAmount(Number.NaN)).toBe("0 BTC");
  });
});

describe("formatPercent / formatSignedPercent", () => {
  it("비중은 부호 없이 소수 2자리로 표기한다", () => {
    expect(formatPercent(3.0125)).toBe("3.01%");
  });

  it("수익률은 이익일 때만 + 를 붙인다", () => {
    expect(formatSignedPercent(132.44)).toBe("+132.4%");
    expect(formatSignedPercent(-12.36)).toBe("-12.4%");
  });

  it("수익률 0(= 매입 데이터 없음)은 하이픈으로 처리한다", () => {
    expect(formatSignedPercent(0)).toBe("-");
  });
});

describe("formatKstDateTime", () => {
  it("타임존과 무관하게 KST 로 변환한다", () => {
    // 2026-07-29T00:00:00Z → KST 09:00
    expect(formatKstDateTime("2026-07-29T00:00:00.000Z")).toBe("2026.07.29 · 09:00 KST");
  });

  it("잘못된 값은 하이픈으로 처리한다", () => {
    expect(formatKstDateTime("not-a-date")).toBe("-");
  });
});

describe("extractTickerCode", () => {
  it("거래소 접두사를 떼어낸다", () => {
    expect(extractTickerCode("NASDAQ:MSTR")).toBe("MSTR");
  });

  it("접두사가 없으면 원본을 그대로 쓴다", () => {
    expect(extractTickerCode("MSTR")).toBe("MSTR");
    expect(extractTickerCode("")).toBe("-");
  });
});

describe("convertCountryCodeToFlagEmoji", () => {
  it("두 글자 국가 코드를 국기 이모지로 바꾼다", () => {
    expect(convertCountryCodeToFlagEmoji("US")).toBe("🇺🇸");
    expect(convertCountryCodeToFlagEmoji("kr")).toBe("🇰🇷");
  });

  it("형식이 맞지 않으면 중립 깃발로 대체한다", () => {
    expect(convertCountryCodeToFlagEmoji("")).toBe("🏳️");
    expect(convertCountryCodeToFlagEmoji("USA")).toBe("🏳️");
  });
});

describe("formatBtcCount", () => {
  it("단위 없이 정수 수량만 돌려준다", () => {
    expect(formatBtcCount(1_282_516.7)).toBe("1,282,517");
  });

  it("수량이 없으면 0 을 돌려준다", () => {
    expect(formatBtcCount(0)).toBe("0");
  });
});
