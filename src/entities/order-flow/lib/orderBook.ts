import { EPSILON, IMBALANCE_BAND_IN_BPS } from "../model/constants";
import type { OrderBookLevel } from "../model/types";

const BASIS_POINT_DIVISOR = 10_000;

/**
 * 오더북 한쪽(매수 또는 매도).
 *
 * 가격→수량 `Map` 이 원본이고, 정렬 결과는 요청 시점에만 만들어 캐시한다. 체결·호가 갱신은
 * 초당 수백 건이지만 정렬이 필요한 곳(HUD·캔버스)은 초당 4~10 회라, 매 갱신마다 정렬하면
 * 그대로 낭비다.
 */
export class OrderBookSide {
  private readonly levels = new Map<number, number>();
  private readonly isBidSide: boolean;
  private sortedLevelsCache: OrderBookLevel[] | null = null;

  constructor(isBidSide: boolean) {
    this.isBidSide = isBidSide;
  }

  get levelCount(): number {
    return this.levels.size;
  }

  /** 수량 0 이하는 해당 가격 레벨 제거를 뜻한다. */
  applyLevel(priceInQuote: number, sizeInBtc: number): void {
    if (sizeInBtc <= 0) {
      if (this.levels.delete(priceInQuote)) {
        this.sortedLevelsCache = null;
      }

      return;
    }

    this.levels.set(priceInQuote, sizeInBtc);
    this.sortedLevelsCache = null;
  }

  /** 스냅샷형 거래소(Upbit)용. 기존 내용을 통째로 바꾼다. */
  replaceAll(levels: Array<[number, number]>): void {
    this.levels.clear();

    for (const [priceInQuote, sizeInBtc] of levels) {
      if (sizeInBtc > 0) {
        this.levels.set(priceInQuote, sizeInBtc);
      }
    }

    this.sortedLevelsCache = null;
  }

  clear(): void {
    this.levels.clear();
    this.sortedLevelsCache = null;
  }

  /** 매수는 높은 가격부터, 매도는 낮은 가격부터 정렬한다. */
  getSortedLevels(): OrderBookLevel[] {
    if (this.sortedLevelsCache !== null) {
      return this.sortedLevelsCache;
    }

    const sortedLevels: OrderBookLevel[] = [];

    this.levels.forEach((sizeInBtc, priceInQuote) => {
      sortedLevels.push({ priceInQuote, sizeInBtc });
    });

    sortedLevels.sort((left, right) =>
      this.isBidSide
        ? right.priceInQuote - left.priceInQuote
        : left.priceInQuote - right.priceInQuote,
    );

    this.sortedLevelsCache = sortedLevels;

    return sortedLevels;
  }

  /** 최우선 호가. 비어 있으면 0. */
  getBestPriceInQuote(): number {
    const sortedLevels = this.getSortedLevels();

    return sortedLevels.length > 0 ? sortedLevels[0].priceInQuote : 0;
  }

  /** 지정 가격 구간에 쌓인 BTC 수량 합. */
  sumSizeInBtcWithinRange(lowerPriceInQuote: number, upperPriceInQuote: number): number {
    let totalSizeInBtc = 0;

    this.levels.forEach((sizeInBtc, priceInQuote) => {
      if (priceInQuote >= lowerPriceInQuote && priceInQuote <= upperPriceInQuote) {
        totalSizeInBtc += sizeInBtc;
      }
    });

    return totalSizeInBtc;
  }
}

/** 매수·매도 양쪽을 묶은 오더북. */
export class OrderBook {
  readonly bids = new OrderBookSide(true);
  readonly asks = new OrderBookSide(false);

  get hasBothSides(): boolean {
    return this.bids.levelCount > 0 && this.asks.levelCount > 0;
  }

  clear(): void {
    this.bids.clear();
    this.asks.clear();
  }

  getMidPriceInQuote(): number {
    const bestBidPriceInQuote = this.bids.getBestPriceInQuote();
    const bestAskPriceInQuote = this.asks.getBestPriceInQuote();

    if (bestBidPriceInQuote <= 0 || bestAskPriceInQuote <= 0) {
      return 0;
    }

    return (bestBidPriceInQuote + bestAskPriceInQuote) / 2;
  }

  getSpreadInQuote(): number {
    const bestBidPriceInQuote = this.bids.getBestPriceInQuote();
    const bestAskPriceInQuote = this.asks.getBestPriceInQuote();

    if (bestBidPriceInQuote <= 0 || bestAskPriceInQuote <= 0) {
      return 0;
    }

    return bestAskPriceInQuote - bestBidPriceInQuote;
  }

  /** mid 기준 ±25bps 안의 매수·매도 BTC 수량. 거래소 통화가 달라도 비교 가능한 값이다. */
  getBandSizesInBtc(): { bidSizeInBtc: number; askSizeInBtc: number } {
    const midPriceInQuote = this.getMidPriceInQuote();

    if (midPriceInQuote <= 0) {
      return { bidSizeInBtc: 0, askSizeInBtc: 0 };
    }

    const bandWidthInQuote = (midPriceInQuote * IMBALANCE_BAND_IN_BPS) / BASIS_POINT_DIVISOR;

    return {
      bidSizeInBtc: this.bids.sumSizeInBtcWithinRange(
        midPriceInQuote - bandWidthInQuote,
        midPriceInQuote,
      ),
      askSizeInBtc: this.asks.sumSizeInBtcWithinRange(
        midPriceInQuote,
        midPriceInQuote + bandWidthInQuote,
      ),
    };
  }

  /**
   * 호가 불균형.
   *
   * `(bid BTC - ask BTC) / (bid BTC + ask BTC + epsilon)` 로 -1 ~ 1 범위다.
   * BTC 수량만 쓰므로 USDT·USD·KRW 를 섞어 비교하는 문제가 생기지 않는다.
   */
  getBookImbalance(): number {
    const { bidSizeInBtc, askSizeInBtc } = this.getBandSizesInBtc();

    return (bidSizeInBtc - askSizeInBtc) / (bidSizeInBtc + askSizeInBtc + EPSILON);
  }

  /** 캔버스 방어벽 표현용 상위 호가. */
  getTopLevels(levelCount: number): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
    return {
      bids: this.bids.getSortedLevels().slice(0, levelCount),
      asks: this.asks.getSortedLevels().slice(0, levelCount),
    };
  }
}
