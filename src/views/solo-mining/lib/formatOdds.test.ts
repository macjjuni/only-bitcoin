import { describe, expect, it } from "vitest";
import {
  formatDurationFromSeconds,
  formatLotteryComparison,
  formatOddsRatio,
  formatProbabilityPercent,
} from "./formatOdds";

describe("formatProbabilityPercent", () => {
  it("0.01% 이상은 소수 4자리로 고정한다", () => {
    expect(formatProbabilityPercent(0.5)).toBe("50.0000%");
    expect(formatProbabilityPercent(0.000123)).toBe("0.0123%");
  });

  it("아주 작은 확률도 유효숫자 3자리가 남도록 자릿수를 늘린다", () => {
    // 1.2e-5 % → 앞의 0 4개 + 유효숫자 3자리
    expect(formatProbabilityPercent(1.7243e-7)).toBe("0.0000172%");
    // NerdMiner 하루 확률. 12자리로 고정하면 유효숫자가 1개만 남는 구간이다.
    expect(formatProbabilityPercent(1.1208e-14)).toBe("0.00000000000112%");
  });

  it("λ 가 극단적으로 작아도 0 으로 뭉개지 않는다", () => {
    expect(formatProbabilityPercent(7.7832e-17)).toBe("0.00000000000000778%");
  });

  it("유효하지 않은 값은 0% 로 처리한다", () => {
    expect(formatProbabilityPercent(0)).toBe("0%");
    expect(formatProbabilityPercent(-1)).toBe("0%");
    expect(formatProbabilityPercent(Number.NaN)).toBe("0%");
    expect(formatProbabilityPercent(Number.POSITIVE_INFINITY)).toBe("0%");
  });

  it("1 이상은 100% 로 자른다", () => {
    expect(formatProbabilityPercent(1)).toBe("100%");
  });
});

describe("formatOddsRatio", () => {
  it("확률의 역수를 한국어 단위로 축약한다", () => {
    expect(formatOddsRatio(1 / 8_145_060)).toBe("1 / 814.5만");
    expect(formatOddsRatio(1.1208e-14)).toBe("1 / 89.2조");
  });

  it("경 단위 이상도 풀어쓰지 않는다", () => {
    expect(formatOddsRatio(7.7832e-17)).toBe("1 / 1.3경");
  });

  it("유효하지 않은 값은 하이픈을 반환한다", () => {
    expect(formatOddsRatio(0)).toBe("-");
    expect(formatOddsRatio(Number.NaN)).toBe("-");
  });
});

describe("formatLotteryComparison", () => {
  it("1배 이상은 배수로 표현한다", () => {
    expect(formatLotteryComparison(2.5)).toBe("로또 1등의 약 2.5배");
    expect(formatLotteryComparison(1_200)).toBe("로또 1등의 약 1,200배");
  });

  it("1배 미만은 역수를 취해 표현한다", () => {
    expect(formatLotteryComparison(0.5)).toBe("로또 1등의 약 1/2 수준");
    expect(formatLotteryComparison(1e-5)).toBe("로또 1등의 약 1/10만 수준");
  });

  it("유효하지 않은 값은 하이픈을 반환한다", () => {
    expect(formatLotteryComparison(0)).toBe("-");
    expect(formatLotteryComparison(Number.NaN)).toBe("-");
  });
});

describe("formatDurationFromSeconds", () => {
  it("크기에 맞는 시간 단위를 고른다", () => {
    expect(formatDurationFromSeconds(45)).toBe("45초");
    expect(formatDurationFromSeconds(3_600)).toBe("1시간");
    expect(formatDurationFromSeconds(86_400 * 3)).toBe("3일");
    expect(formatDurationFromSeconds(2_629_746 * 5)).toBe("5개월");
    expect(formatDurationFromSeconds(31_556_952 * 12)).toBe("12년");
  });

  it("만 년 이상은 한국어 단위로 축약한다", () => {
    expect(formatDurationFromSeconds(31_556_952 * 15_878)).toBe("1.6만년");
  });

  it("무한대는 ∞ 로 표기한다", () => {
    expect(formatDurationFromSeconds(Number.POSITIVE_INFINITY)).toBe("∞");
    expect(formatDurationFromSeconds(0)).toBe("∞");
  });
});
