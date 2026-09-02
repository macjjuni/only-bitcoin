import type ReconnectingWebSocket from "reconnecting-websocket";
import {
  isPlainObject,
  parseFiniteNumber,
  parseIdentifier,
  parseLevelPairs,
  parsePositiveNumber,
} from "../lib/guards";
import {
  BINANCE_DEPTH_SNAPSHOT_URL,
  BINANCE_STREAM_URL,
  STALE_THRESHOLD_IN_MS,
} from "../model/constants";
import { VenueFeedBase } from "./venueFeedBase";

/** 버퍼가 이보다 커지면 스냅샷이 따라잡지 못한 것으로 보고 처음부터 다시 맞춘다. */
const MAX_BUFFERED_DIFF_COUNT = 3000;

/** 스냅샷 재요청 백오프. */
const SNAPSHOT_RETRY_MIN_DELAY_IN_MS = 1000;
const SNAPSHOT_RETRY_MAX_DELAY_IN_MS = 15_000;

interface DepthDiff {
  firstUpdateID: number;
  finalUpdateID: number;
  bidLevels: Array<[number, number]>;
  askLevels: Array<[number, number]>;
  eventTimestampInMs: number;
}

/** 오더북 diff 를 적용할 수 있는 상태인지 나타낸다. */
type SyncState = "buffering" | "awaitingDiff" | "synced";

/**
 * Binance 현물 BTCUSDT 커넥터.
 *
 * `depth@100ms` 는 변경분만 보내므로 REST 스냅샷과 시퀀스를 맞춰야 오더북이 성립한다.
 * 공식 문서의 동기화 절차를 그대로 구현한다.
 *
 * 1. 소켓의 diff 를 버퍼에 쌓는다.
 * 2. REST 스냅샷과 `lastUpdateId` 를 받는다.
 * 3. `u <= lastUpdateId` 인 diff 를 버린다.
 * 4. 남은 첫 diff 가 `U <= lastUpdateId + 1 <= u` 를 만족하는지 검사한다.
 * 5. 스냅샷으로 오더북을 세우고 diff 를 순서대로 적용한다.
 * 6. 수량 0 인 레벨은 제거한다.
 * 7. update ID 가 끊기면 오더북을 버리고 다시 동기화한다.
 *
 * @see https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
 */
export class BinanceFeed extends VenueFeedBase {
  private syncState: SyncState = "buffering";
  private bufferedDiffs: DepthDiff[] = [];
  private lastAppliedUpdateID = 0;
  /**
   * 진행 중인 스냅샷 요청 세대.
   *
   * 재연결이나 재동기화가 겹치면 뒤늦게 도착한 예전 스냅샷이 새 오더북을 덮어쓸 수 있다.
   * 세대가 다른 응답은 버린다.
   */
  private snapshotGeneration = 0;
  private snapshotRetryDelayInMs = SNAPSHOT_RETRY_MIN_DELAY_IN_MS;
  private snapshotRetryTimerID: ReturnType<typeof setTimeout> | null = null;
  private snapshotAbortController: AbortController | null = null;
  private awaitingDiffSinceInMs = 0;

  constructor() {
    super("binance");
  }

  //#region [Life Cycles]
  protected getStreamUrl(): string {
    return BINANCE_STREAM_URL;
  }

  /** 결합 스트림 주소에 채널이 들어 있어 보낼 구독 메시지가 없다. 대신 스냅샷을 요청한다. */
  protected subscribe(_socket: ReconnectingWebSocket): void {
    this.requestDepthSnapshot();
  }

  protected resetSyncState(): void {
    this.syncState = "buffering";
    this.bufferedDiffs = [];
    this.lastAppliedUpdateID = 0;
    this.awaitingDiffSinceInMs = 0;
    this.snapshotGeneration += 1;
    this.cancelPendingSnapshot();
  }

  override stop(): void {
    this.cancelPendingSnapshot();
    this.snapshotRetryDelayInMs = SNAPSHOT_RETRY_MIN_DELAY_IN_MS;
    super.stop();
  }

  /**
   * 동기화 감시.
   *
   * 소켓은 멀쩡히 diff 를 받고 있는데 스냅샷만 못 받은 상태가 되면 오더북이 영영 서지 않는다.
   * 이 상태에서는 스스로 빠져나올 방법이 없으므로, 주기 갱신 때마다 "diff 를 버퍼링 중인데
   * 요청도 재시도 예약도 없는" 막힌 상태를 찾아 다시 요청을 건다.
   */
  override refreshDerived(nowInMs: number): void {
    super.refreshDerived(nowInMs);

    const isSnapshotStalled =
      this.syncState === "buffering" &&
      this.snapshotAbortController === null &&
      this.snapshotRetryTimerID === null;

    const hasAwaitingDiffTimedOut =
      this.syncState === "awaitingDiff" &&
      nowInMs - this.awaitingDiffSinceInMs > STALE_THRESHOLD_IN_MS;

    if (hasAwaitingDiffTimedOut) {
      this.diagnostics.resyncCount += 1;
      this.forceReconnect();
      return;
    }

    if (isSnapshotStalled && this.hasOpenSocket) {
      this.requestDepthSnapshot();
    }
  }
  //#endregion

  //#region [Privates]
  private cancelPendingSnapshot(): void {
    if (this.snapshotRetryTimerID !== null) {
      clearTimeout(this.snapshotRetryTimerID);
      this.snapshotRetryTimerID = null;
    }

    this.snapshotAbortController?.abort();
    this.snapshotAbortController = null;
  }

  /** 오더북을 버리고 스냅샷부터 다시 맞춘다. */
  private restartSynchronization(): void {
    this.diagnostics.resyncCount += 1;
    this.orderBook.clear();
    this.syncState = "buffering";
    this.bufferedDiffs = [];
    this.lastAppliedUpdateID = 0;
    this.awaitingDiffSinceInMs = 0;
    this.snapshotGeneration += 1;
    this.markSyncing();
    this.cancelPendingSnapshot();
    this.requestDepthSnapshot();
  }

  private scheduleSnapshotRetry(): void {
    if (this.snapshotRetryTimerID !== null) {
      return;
    }

    const retryDelayInMs = this.snapshotRetryDelayInMs;
    this.snapshotRetryDelayInMs = Math.min(
      SNAPSHOT_RETRY_MAX_DELAY_IN_MS,
      Math.round(this.snapshotRetryDelayInMs * 1.8),
    );

    this.snapshotRetryTimerID = setTimeout(() => {
      this.snapshotRetryTimerID = null;
      this.requestDepthSnapshot();
    }, retryDelayInMs);
  }

  /**
   * 스냅샷을 오더북에 심고 버퍼에 쌓인 diff 를 순서대로 적용한다.
   * 시퀀스가 맞지 않으면 아무것도 적용하지 않고 다시 요청한다.
   */
  private applySnapshot(
    lastUpdateID: number,
    bidLevels: Array<[number, number]>,
    askLevels: Array<[number, number]>,
  ): void {
    if (bidLevels.length === 0 || askLevels.length === 0) {
      this.diagnostics.parseErrorCount += 1;
      this.scheduleSnapshotRetry();
      return;
    }

    const pendingDiffs = this.bufferedDiffs.filter((diff) => diff.finalUpdateID > lastUpdateID);
    const firstDiff = pendingDiffs[0];

    if (
      firstDiff !== undefined &&
      !(firstDiff.firstUpdateID <= lastUpdateID + 1 && lastUpdateID + 1 <= firstDiff.finalUpdateID)
    ) {
      this.diagnostics.sequenceGapCount += 1;
      this.scheduleSnapshotRetry();
      return;
    }

    this.orderBook.bids.replaceAll(bidLevels);
    this.orderBook.asks.replaceAll(askLevels);
    this.lastAppliedUpdateID = lastUpdateID;
    this.bufferedDiffs = [];

    if (firstDiff === undefined) {
      this.syncState = "awaitingDiff";
      this.awaitingDiffSinceInMs = Date.now();
      this.snapshotRetryDelayInMs = SNAPSHOT_RETRY_MIN_DELAY_IN_MS;
      this.markOrderBookReceived();
      this.markSyncing();
      return;
    }

    this.syncState = "synced";

    for (const diff of pendingDiffs) {
      if (!this.applyDiff(diff)) {
        return;
      }
    }

    this.awaitingDiffSinceInMs = 0;
    this.snapshotRetryDelayInMs = SNAPSHOT_RETRY_MIN_DELAY_IN_MS;
    this.markSynchronized();
  }

  /** diff 한 건 적용. 시퀀스가 끊기면 `false` 를 돌려주고 재동기화를 건다. */
  private applyDiff(diff: DepthDiff): boolean {
    const nextExpectedUpdateID = this.lastAppliedUpdateID + 1;
    const isContinuous =
      this.lastAppliedUpdateID === 0 ||
      (diff.firstUpdateID <= nextExpectedUpdateID && nextExpectedUpdateID <= diff.finalUpdateID);

    if (!isContinuous) {
      this.diagnostics.sequenceGapCount += 1;
      this.restartSynchronization();
      return false;
    }

    for (const [priceInQuote, sizeInBtc] of diff.bidLevels) {
      this.orderBook.bids.applyLevel(priceInQuote, sizeInBtc);
    }

    for (const [priceInQuote, sizeInBtc] of diff.askLevels) {
      this.orderBook.asks.applyLevel(priceInQuote, sizeInBtc);
    }

    this.lastAppliedUpdateID = diff.finalUpdateID;
    this.markOrderBookReceived(diff.eventTimestampInMs || undefined);

    return true;
  }

  private handleDepthUpdate(eventPayload: Record<string, unknown>): void {
    const firstUpdateID = parseFiniteNumber(eventPayload.U);
    const finalUpdateID = parseFiniteNumber(eventPayload.u);

    if (firstUpdateID === null || finalUpdateID === null) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    if (!Array.isArray(eventPayload.b) || !Array.isArray(eventPayload.a)) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    const diff: DepthDiff = {
      firstUpdateID,
      finalUpdateID,
      bidLevels: parseLevelPairs(eventPayload.b),
      askLevels: parseLevelPairs(eventPayload.a),
      eventTimestampInMs: parseFiniteNumber(eventPayload.E) ?? 0,
    };

    if (this.syncState === "buffering") {
      this.bufferedDiffs.push(diff);

      if (this.bufferedDiffs.length > MAX_BUFFERED_DIFF_COUNT) {
        this.diagnostics.sequenceGapCount += 1;
        this.restartSynchronization();
      }

      return;
    }

    // 스냅샷보다 오래된 diff 는 이미 반영된 내용이라 무시한다.
    if (diff.finalUpdateID <= this.lastAppliedUpdateID) {
      return;
    }

    if (this.applyDiff(diff)) {
      this.syncState = "synced";
      this.awaitingDiffSinceInMs = 0;
      this.markSynchronized();
    }
  }

  /**
   * `aggTrade` 의 `m` 은 매수자가 메이커였는지를 뜻한다.
   * `true` 면 테이커가 매도, `false` 면 테이커가 매수다.
   */
  private handleAggregateTrade(eventPayload: Record<string, unknown>): void {
    const tradeID = parseIdentifier(eventPayload.a);
    const priceInQuote = parsePositiveNumber(eventPayload.p);
    const sizeInBtc = parsePositiveNumber(eventPayload.q);
    const tradeTimestampInMs = parseFiniteNumber(eventPayload.T);
    const isBuyerMarketMaker = eventPayload.m;

    if (
      tradeID === null ||
      priceInQuote === null ||
      sizeInBtc === null ||
      typeof isBuyerMarketMaker !== "boolean"
    ) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    this.markTradeReceived(tradeTimestampInMs ?? undefined);

    this.recordTrade({
      tradeID: `binance-${tradeID}`,
      sourceTimestampInMs: tradeTimestampInMs ?? Date.now(),
      priceInQuote,
      sizeInBtc,
      aggressorSide: isBuyerMarketMaker ? "sell" : "buy",
    });
  }

  protected handleParsedMessage(message: unknown): void {
    if (!isPlainObject(message)) {
      return;
    }

    // 결합 스트림은 `{ stream, data }` 로 한 겹 감싸서 준다.
    const payload = isPlainObject(message.data) ? message.data : message;
    const eventType = payload.e;

    if (eventType === "depthUpdate") {
      this.handleDepthUpdate(payload);
      return;
    }

    if (eventType === "aggTrade") {
      this.handleAggregateTrade(payload);
    }
  }
  //#endregion

  //#region [Transactions]
  /**
   * REST 오더북 스냅샷을 받아 온다.
   *
   * `api.binance.com` 은 `Access-Control-Allow-Origin: *` 를 주므로 브라우저에서 바로 부른다.
   * 실패해도 이 거래소만 `syncing` 에 머물 뿐 다른 거래소와 렌더 루프는 그대로 돈다.
   */
  private async requestDepthSnapshot(): Promise<void> {
    const requestGeneration = this.snapshotGeneration;
    const abortController = new AbortController();
    this.snapshotAbortController = abortController;

    try {
      const response = await fetch(BINANCE_DEPTH_SNAPSHOT_URL, {
        signal: abortController.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Binance depth snapshot failed: ${response.status}`);
      }

      const snapshot: unknown = await response.json();

      if (requestGeneration !== this.snapshotGeneration) {
        return;
      }

      if (!isPlainObject(snapshot)) {
        throw new Error("Binance depth snapshot is not an object");
      }

      const lastUpdateID = parseFiniteNumber(snapshot.lastUpdateId);

      if (lastUpdateID === null) {
        throw new Error("Binance depth snapshot has no lastUpdateId");
      }

      this.applySnapshot(
        lastUpdateID,
        parseLevelPairs(snapshot.bids),
        parseLevelPairs(snapshot.asks),
      );
    } catch {
      if (abortController.signal.aborted || requestGeneration !== this.snapshotGeneration) {
        return;
      }

      this.diagnostics.parseErrorCount += 1;
      this.scheduleSnapshotRetry();
    } finally {
      if (this.snapshotAbortController === abortController) {
        this.snapshotAbortController = null;
      }
    }
  }
  //#endregion
}
