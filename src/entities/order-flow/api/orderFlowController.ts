import { calculateAggregatePressure } from "../lib/metrics";
import { TRADE_WINDOW_IN_MS, VENUE_IDS } from "../model/constants";
import { createEmptyOrderFlowSnapshot } from "../model/snapshot";
import type {
  OrderFlowSnapshot,
  TradeTick,
  VenueDiagnostics,
  VenueId,
  VenueMetrics,
} from "../model/types";
import { BinanceFeed } from "./binanceFeed";
import { CoinbaseFeed } from "./coinbaseFeed";
import { UpbitFeed } from "./upbitFeed";
import type { VenueFeedBase } from "./venueFeedBase";

/**
 * 마지막 사용자가 떠난 뒤 실제로 소켓을 닫기까지의 유예.
 *
 * React Strict Mode 는 개발 중 effect 를 마운트 → 언마운트 → 마운트로 두 번 돌린다.
 * 유예 없이 바로 닫으면 세 거래소 소켓이 붙자마자 끊기고 다시 붙어, 스냅샷 동기화가
 * 매번 처음부터 되풀이된다. 잠깐 기다렸다가 다시 잡히면 그대로 이어 쓴다.
 */
const DEFERRED_STOP_DELAY_IN_MS = 1500;

/**
 * 세 거래소 커넥터를 한곳에서 관리하는 컨트롤러.
 *
 * 모듈 단위 싱글턴이라 어느 컴포넌트가 몇 번 마운트되든 소켓은 거래소당 하나다.
 * 참조 수를 세어 마지막 사용자가 사라질 때만 연결을 정리한다.
 * 거래소끼리는 완전히 독립적이라 한 곳이 죽어도 나머지는 그대로 돈다.
 */
class OrderFlowController {
  private feedsByVenue: Map<VenueId, VenueFeedBase> | null = null;
  private referenceCount = 0;
  private deferredStopTimerID: ReturnType<typeof setTimeout> | null = null;

  //#region [Privates]
  /** 브라우저에서 처음 필요해진 시점에만 커넥터를 만든다. 서버에서는 만들지 않는다. */
  private ensureFeeds(): Map<VenueId, VenueFeedBase> | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (this.feedsByVenue === null) {
      this.feedsByVenue = new Map<VenueId, VenueFeedBase>([
        ["binance", new BinanceFeed()],
        ["coinbase", new CoinbaseFeed()],
        ["upbit", new UpbitFeed()],
      ]);
    }

    return this.feedsByVenue;
  }

  private cancelDeferredStop(): void {
    if (this.deferredStopTimerID !== null) {
      clearTimeout(this.deferredStopTimerID);
      this.deferredStopTimerID = null;
    }
  }
  //#endregion

  //#region [Life Cycles]
  /** 사용자 한 명 추가. 첫 사용자면 세 거래소 연결을 연다. */
  acquire(): void {
    this.cancelDeferredStop();
    this.referenceCount += 1;

    const feeds = this.ensureFeeds();

    if (feeds === null || this.referenceCount > 1) {
      return;
    }

    feeds.forEach((feed) => {
      feed.start();
    });
  }

  /** 사용자 한 명 제거. 마지막 사용자였다면 유예 뒤 연결을 닫고 `true`를 반환한다. */
  release(): boolean {
    this.referenceCount = Math.max(0, this.referenceCount - 1);

    if (this.referenceCount > 0) {
      return false;
    }

    this.cancelDeferredStop();

    this.deferredStopTimerID = setTimeout(() => {
      this.deferredStopTimerID = null;

      if (this.referenceCount > 0) {
        return;
      }

      this.feedsByVenue?.forEach((feed) => {
        feed.stop();
      });
    }, DEFERRED_STOP_DELAY_IN_MS);

    return true;
  }
  //#endregion

  //#region [Readers]
  getFeeds(): VenueFeedBase[] {
    const feeds = this.feedsByVenue;

    if (feeds === null) {
      return [];
    }

    return VENUE_IDS.map((venue) => feeds.get(venue)).filter(
      (feed): feed is VenueFeedBase => feed !== undefined,
    );
  }

  getFeed(venue: VenueId): VenueFeedBase | null {
    return this.feedsByVenue?.get(venue) ?? null;
  }

  /**
   * 모든 거래소에서 체결 이벤트를 꺼낸다.
   *
   * 한 프레임에 만들 수 있는 효과 수가 정해져 있으므로 거래소마다 같은 몫씩 가져온다.
   * 거래량이 많은 거래소가 몫을 독식해 다른 거래소 체결이 화면에서 사라지는 것을 막는다.
   */
  drainTrades(limitPerVenue: number): TradeTick[] {
    const drainedTrades: TradeTick[] = [];

    for (const feed of this.getFeeds()) {
      drainedTrades.push(...feed.drainTrades(limitPerVenue));
    }

    return drainedTrades;
  }

  /** 쌓여 있던 체결 이벤트를 버린다. 백그라운드에서 돌아왔을 때 몰아치기를 막는다. */
  discardPendingTrades(): void {
    this.feedsByVenue?.forEach((feed) => {
      feed.discardPendingTrades();
    });
  }

  /**
   * HUD 용 스냅샷을 만든다.
   *
   * 전체 압력은 `live` 거래소의 `venuePressure` 평균이다. 가격이나 거래대금을 더하지
   * 않으므로 USDT·USD·KRW 가 섞여도 환율이 필요 없다.
   */
  buildSnapshot(nowInMs: number): OrderFlowSnapshot {
    const feeds = this.getFeeds();

    if (feeds.length === 0) {
      return createEmptyOrderFlowSnapshot();
    }

    const venues = {} as Record<VenueId, VenueMetrics>;
    const diagnostics = {} as Record<VenueId, VenueDiagnostics>;
    const venueMetricsList: VenueMetrics[] = [];
    let windowTradeCount = 0;

    for (const feed of feeds) {
      feed.refreshDerived(nowInMs);

      const venueMetrics = feed.getMetrics(nowInMs);
      venues[feed.venue] = venueMetrics;
      diagnostics[feed.venue] = feed.getDiagnostics();
      venueMetricsList.push(venueMetrics);
      windowTradeCount += feed.getWindowTradeCount();
    }

    const { aggregatePressure, includedVenues } = calculateAggregatePressure(venueMetricsList);

    return {
      venues,
      diagnostics,
      aggregatePressure,
      includedVenues,
      tradesPerSecond: windowTradeCount / (TRADE_WINDOW_IN_MS / 1000),
      updatedAtInMs: nowInMs,
    };
  }
  //#endregion
}

/** 앱 전체가 공유하는 단일 인스턴스. */
export const orderFlowController = new OrderFlowController();
