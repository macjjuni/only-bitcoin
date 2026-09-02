import { TRADE_SIZE_SAMPLE_LIMIT } from "../model/constants";
import type { TradeMagnitude } from "../model/types";

/** 등급 경계 백분위. */
const MEDIUM_PERCENTILE = 0.5;
const LARGE_PERCENTILE = 0.9;
const HUGE_PERCENTILE = 0.97;

/** 표본이 이보다 적으면 분포를 믿을 수 없어 전부 작은 효과로 둔다. */
const MINIMUM_SAMPLE_COUNT = 20;

/**
 * 거래소별 체결 규모 등급기.
 *
 * 거래대금은 통화가 달라 비교할 수 없으므로 **BTC 수량의 자체 백분위**만 쓴다.
 * 임계값은 표본이 바뀔 때마다 다시 정렬하지 않고, HUD 커밋 주기에 맞춰 갱신한다.
 */
export class TradeSizeScale {
  private readonly samplesInBtc: number[] = [];
  private writeIndex = 0;
  private mediumThresholdInBtc = Number.POSITIVE_INFINITY;
  private largeThresholdInBtc = Number.POSITIVE_INFINITY;
  private hugeThresholdInBtc = Number.POSITIVE_INFINITY;

  addSample(sizeInBtc: number): void {
    if (sizeInBtc <= 0) {
      return;
    }

    if (this.samplesInBtc.length < TRADE_SIZE_SAMPLE_LIMIT) {
      this.samplesInBtc.push(sizeInBtc);
      return;
    }

    this.samplesInBtc[this.writeIndex] = sizeInBtc;
    this.writeIndex = (this.writeIndex + 1) % TRADE_SIZE_SAMPLE_LIMIT;
  }

  /** 표본을 정렬해 등급 경계를 다시 잡는다. 비용이 있으므로 주기적으로만 부른다. */
  refreshThresholds(): void {
    if (this.samplesInBtc.length < MINIMUM_SAMPLE_COUNT) {
      return;
    }

    const sortedSamplesInBtc = [...this.samplesInBtc].sort((left, right) => left - right);

    this.mediumThresholdInBtc = pickPercentile(sortedSamplesInBtc, MEDIUM_PERCENTILE);
    this.largeThresholdInBtc = pickPercentile(sortedSamplesInBtc, LARGE_PERCENTILE);
    this.hugeThresholdInBtc = pickPercentile(sortedSamplesInBtc, HUGE_PERCENTILE);
  }

  classifyMagnitude(sizeInBtc: number): TradeMagnitude {
    if (sizeInBtc >= this.hugeThresholdInBtc) {
      return "huge";
    }

    if (sizeInBtc >= this.largeThresholdInBtc) {
      return "large";
    }

    if (sizeInBtc >= this.mediumThresholdInBtc) {
      return "medium";
    }

    return "small";
  }

  clear(): void {
    this.samplesInBtc.length = 0;
    this.writeIndex = 0;
    this.mediumThresholdInBtc = Number.POSITIVE_INFINITY;
    this.largeThresholdInBtc = Number.POSITIVE_INFINITY;
    this.hugeThresholdInBtc = Number.POSITIVE_INFINITY;
  }
}

/** 오름차순 배열에서 백분위 값을 고른다. */
function pickPercentile(sortedValues: number[], percentile: number): number {
  const targetIndex = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor(sortedValues.length * percentile)),
  );

  return sortedValues[targetIndex];
}
