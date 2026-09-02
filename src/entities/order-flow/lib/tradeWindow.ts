import { EPSILON, TRADE_WINDOW_IN_MS } from "../model/constants";
import type { TradeSide } from "../model/types";

interface WindowEntry {
  timestampInMs: number;
  sizeInBtc: number;
  aggressorSide: TradeSide;
}

/** 압축 임계치. 소비된 앞부분이 이만큼 쌓이면 배열을 잘라 낸다. */
const COMPACTION_THRESHOLD = 256;

/**
 * 최근 5초 체결량 집계 창.
 *
 * 매 체결마다 전체를 재계산하지 않고 합계를 증분으로 유지한다. 만료된 항목은 앞에서
 * 빼면서 합계에서 덜어 낸다. `shift()` 는 O(n) 이라 시작 인덱스를 옮기고 가끔 압축한다.
 */
export class TradeVolumeWindow {
  private readonly entries: WindowEntry[] = [];
  private startIndex = 0;
  private buyVolumeInBtc = 0;
  private sellVolumeInBtc = 0;

  add(timestampInMs: number, sizeInBtc: number, aggressorSide: TradeSide): void {
    this.entries.push({ timestampInMs, sizeInBtc, aggressorSide });

    if (aggressorSide === "buy") {
      this.buyVolumeInBtc += sizeInBtc;
      return;
    }

    this.sellVolumeInBtc += sizeInBtc;
  }

  /** 창을 벗어난 체결을 제거한다. 렌더·집계 직전에 호출한다. */
  prune(nowInMs: number): void {
    const expireBeforeInMs = nowInMs - TRADE_WINDOW_IN_MS;

    while (
      this.startIndex < this.entries.length &&
      this.entries[this.startIndex].timestampInMs < expireBeforeInMs
    ) {
      const expiredEntry = this.entries[this.startIndex];

      if (expiredEntry.aggressorSide === "buy") {
        this.buyVolumeInBtc -= expiredEntry.sizeInBtc;
      } else {
        this.sellVolumeInBtc -= expiredEntry.sizeInBtc;
      }

      this.startIndex += 1;
    }

    if (this.startIndex >= COMPACTION_THRESHOLD) {
      this.entries.splice(0, this.startIndex);
      this.startIndex = 0;
    }

    // 부동소수 누적 오차로 합계가 음수로 새는 것을 막는다.
    this.buyVolumeInBtc = Math.max(0, this.buyVolumeInBtc);
    this.sellVolumeInBtc = Math.max(0, this.sellVolumeInBtc);
  }

  getBuyVolumeInBtc(): number {
    return this.buyVolumeInBtc;
  }

  getSellVolumeInBtc(): number {
    return this.sellVolumeInBtc;
  }

  getTradeCount(): number {
    return this.entries.length - this.startIndex;
  }

  /** `(매수 BTC - 매도 BTC) / (매수 + 매도 + epsilon)`, -1 ~ 1. */
  getTradePressure(): number {
    return (
      (this.buyVolumeInBtc - this.sellVolumeInBtc) /
      (this.buyVolumeInBtc + this.sellVolumeInBtc + EPSILON)
    );
  }

  clear(): void {
    this.entries.length = 0;
    this.startIndex = 0;
    this.buyVolumeInBtc = 0;
    this.sellVolumeInBtc = 0;
  }
}
