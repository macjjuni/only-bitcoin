import ReconnectingWebSocket from "reconnecting-websocket";
import { BoundedIdSet } from "../lib/boundedIdSet";
import { decodeSocketPayload, parseJsonSafely } from "../lib/guards";
import { calculateMomentum, calculateVenuePressure, MidPriceHistory } from "../lib/metrics";
import { OrderBook } from "../lib/orderBook";
import { RingBuffer } from "../lib/ringBuffer";
import { TradeSizeScale } from "../lib/tradeSizeScale";
import { TradeVolumeWindow } from "../lib/tradeWindow";
import {
  RECONNECT_JITTER_IN_MS,
  RECONNECT_MAX_DELAY_IN_MS,
  RECONNECT_MIN_DELAY_IN_MS,
  STALE_THRESHOLD_IN_MS,
  TRADE_EVENT_QUEUE_LIMIT,
  TRADE_ID_CACHE_LIMIT,
  UNKNOWN_LATENCY_IN_MS,
} from "../model/constants";
import type {
  ConnectionStatus,
  TradeSide,
  TradeTick,
  VenueDiagnostics,
  VenueId,
  VenueMetrics,
} from "../model/types";

/** 지연 시간이 터무니없이 큰 값으로 보고되지 않도록 자르는 상한. */
const MAX_REPORTED_LATENCY_IN_MS = 60_000;

interface RecordTradeInput {
  tradeID: string;
  sourceTimestampInMs: number;
  priceInQuote: number;
  sizeInBtc: number;
  aggressorSide: TradeSide;
}

/**
 * 거래소 커넥터 공통 베이스.
 *
 * 소켓 수명주기, 중복 제거, 집계, 지표 계산처럼 세 거래소가 똑같이 하는 일을 모은다.
 * 거래소마다 다른 것은 구독 메시지와 메시지 해석뿐이라 그 둘만 하위 클래스가 채운다.
 * React 를 전혀 모르므로 렌더 주기와 무관하게 동작하고, 체결마다 state 를 건드리지 않는다.
 */
export abstract class VenueFeedBase {
  readonly venue: VenueId;
  readonly orderBook = new OrderBook();

  protected readonly tradeWindow = new TradeVolumeWindow();
  protected readonly tradeSizeScale = new TradeSizeScale();
  protected readonly midPriceHistory = new MidPriceHistory();
  protected readonly tradeIDCache = new BoundedIdSet(TRADE_ID_CACHE_LIMIT);
  protected readonly diagnostics: VenueDiagnostics = {
    reconnectCount: 0,
    resyncCount: 0,
    sequenceGapCount: 0,
    parseErrorCount: 0,
  };

  private readonly tradeEventQueue = new RingBuffer<TradeTick>(TRADE_EVENT_QUEUE_LIMIT);
  private socket: ReconnectingWebSocket | null = null;
  private status: ConnectionStatus = "connecting";
  private lastMessageAtInMs = 0;
  private lastOrderBookAtInMs = 0;
  private lastTradeAtInMs = 0;
  private latencyInMs = UNKNOWN_LATENCY_IN_MS;
  private hasOpenedOnce = false;

  constructor(venue: VenueId) {
    this.venue = venue;
  }

  //#region [Abstracts]
  /** 접속할 WebSocket 주소. */
  protected abstract getStreamUrl(): string;

  /** 연결 직후 보내야 하는 구독 메시지 처리. 구독이 필요 없으면 비워 둔다. */
  protected abstract subscribe(socket: ReconnectingWebSocket): void;

  /** JSON 으로 해석된 메시지와 정밀도 손실 전 원문을 함께 처리한다. */
  protected abstract handleParsedMessage(message: unknown, rawText: string): void;

  /** 재연결이나 재동기화 시 거래소별 시퀀스 상태를 초기화한다. */
  protected abstract resetSyncState(): void;
  //#endregion

  //#region [Life Cycles]
  start(): void {
    if (this.socket !== null || typeof window === "undefined") {
      return;
    }

    this.status = "connecting";

    /**
     * 지터를 최소 지연에 섞는다.
     *
     * 세 거래소가 같은 순간(네트워크 복구 등)에 끊기면 동일한 백오프로 동시에 재접속을
     * 시도한다. 인스턴스마다 시작점을 흩어 두면 그 몰림이 사라진다.
     */
    const jitteredMinDelayInMs = RECONNECT_MIN_DELAY_IN_MS + Math.random() * RECONNECT_JITTER_IN_MS;

    const socket = new ReconnectingWebSocket(this.getStreamUrl(), [], {
      minReconnectionDelay: jitteredMinDelayInMs,
      maxReconnectionDelay: RECONNECT_MAX_DELAY_IN_MS,
      reconnectionDelayGrowFactor: 1.6,
      minUptime: 5000,
      connectionTimeout: 8000,
      maxRetries: Number.POSITIVE_INFINITY,
      maxEnqueuedMessages: 0,
      startClosed: false,
      debug: false,
    });

    socket.binaryType = "arraybuffer";

    /**
     * 이 소켓이 아직 현재 소켓인지 확인한다.
     *
     * `stop()` 으로 닫은 소켓의 `close` 이벤트는 비동기라, 페이지를 빠르게 떠났다 돌아오면
     * **새 소켓이 열린 뒤에** 도착할 수 있다. 그때 옛 핸들러가 그대로 돌면 새 연결의
     * 동기화 상태를 지우고 진행 중인 스냅샷 재시도까지 취소해 버려, 오더북이 영영 안 선다.
     * 그래서 세대가 지난 소켓의 이벤트는 전부 버린다.
     */
    const isCurrentSocket = (): boolean => this.socket === socket;

    socket.onopen = () => {
      if (!isCurrentSocket()) {
        return;
      }

      if (this.hasOpenedOnce) {
        this.diagnostics.reconnectCount += 1;
      }

      this.hasOpenedOnce = true;
      this.orderBook.clear();
      this.resetMessageFreshness();
      this.resetSyncState();
      this.status = "syncing";
      this.subscribe(socket);
    };

    socket.onmessage = (messageEvent) => {
      if (!isCurrentSocket()) {
        return;
      }

      this.consumeSocketPayload(messageEvent.data);
    };

    socket.onerror = () => {
      if (!isCurrentSocket()) {
        return;
      }

      this.status = "error";
    };

    socket.onclose = () => {
      if (!isCurrentSocket()) {
        return;
      }

      this.orderBook.clear();
      this.resetMessageFreshness();
      this.resetSyncState();

      if (this.status !== "error") {
        this.status = "connecting";
      }
    };

    this.socket = socket;
  }

  stop(): void {
    const closingSocket = this.socket;
    // 먼저 현재 소켓 자리를 비워야 뒤늦게 오는 close 이벤트가 세대 검사에 걸린다.
    this.socket = null;
    closingSocket?.close(1000);
    this.status = "connecting";
    this.hasOpenedOnce = false;
    this.resetMessageFreshness();
    this.orderBook.clear();
    this.tradeWindow.clear();
    this.tradeSizeScale.clear();
    this.midPriceHistory.clear();
    this.tradeIDCache.clear();
    this.tradeEventQueue.clear();
    this.resetSyncState();
  }

  /** 소켓이 열려 메시지를 받을 수 있는 상태인지. */
  protected get hasOpenSocket(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /** 소켓 재연결을 강제한다. 시퀀스가 깨져 그 자리에서 복구할 수 없을 때 쓴다. */
  protected forceReconnect(): void {
    this.orderBook.clear();
    this.resetSyncState();
    this.status = "syncing";
    this.socket?.reconnect();
  }
  //#endregion

  //#region [Privates]
  /** 문자열이나 바이너리 페이로드를 JSON 으로 만들어 하위 클래스에 넘긴다. */
  private consumeSocketPayload(payload: unknown): void {
    const rawText = decodeSocketPayload(payload);

    if (rawText === null) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    const parsedMessage = parseJsonSafely(rawText);

    if (parsedMessage === null) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    try {
      this.handleParsedMessage(parsedMessage, rawText);
    } catch {
      // 거래소 스키마가 바뀌어도 다른 거래소와 렌더 루프는 계속 살아 있어야 한다.
      this.diagnostics.parseErrorCount += 1;
    }
  }

  private resolveEffectiveStatus(nowInMs: number): ConnectionStatus {
    if (this.status === "error" || this.status === "connecting") {
      return this.status;
    }

    if (this.status === "syncing" || this.lastOrderBookAtInMs === 0) {
      return "syncing";
    }

    if (nowInMs - this.lastOrderBookAtInMs > STALE_THRESHOLD_IN_MS) {
      return "stale";
    }

    return this.status;
  }

  private resetMessageFreshness(): void {
    this.lastMessageAtInMs = 0;
    this.lastOrderBookAtInMs = 0;
    this.lastTradeAtInMs = 0;
    this.latencyInMs = UNKNOWN_LATENCY_IN_MS;
  }

  private markMessageReceived(sourceTimestampInMs?: number): number {
    const receivedAtInMs = Date.now();
    this.lastMessageAtInMs = receivedAtInMs;

    if (sourceTimestampInMs !== undefined && sourceTimestampInMs > 0) {
      this.latencyInMs = Math.min(
        MAX_REPORTED_LATENCY_IN_MS,
        Math.max(0, receivedAtInMs - sourceTimestampInMs),
      );
    }

    return receivedAtInMs;
  }

  /**
   * 메시지를 받았다는 사실과 지연 시간을 기록한다.
   *
   * 지연은 거래소 시각과 로컬 시각의 차이라 브라우저 시계가 조금만 앞서 있어도 음수가 된다.
   * 그런 값은 0 으로 눌러 두되, "아직 한 번도 못 쟀음"(`UNKNOWN_LATENCY_IN_MS`)과는 구분한다.
   */
  protected markOrderBookReceived(sourceTimestampInMs?: number): void {
    this.lastOrderBookAtInMs = this.markMessageReceived(sourceTimestampInMs);
  }

  protected markTradeReceived(sourceTimestampInMs?: number): void {
    this.lastTradeAtInMs = this.markMessageReceived(sourceTimestampInMs);
  }

  protected markHeartbeatReceived(sourceTimestampInMs?: number): void {
    this.markMessageReceived(sourceTimestampInMs);
  }

  /** 오더북 기준점이 만들어져 지표를 신뢰할 수 있게 되면 호출한다. */
  protected markSynchronized(): void {
    if (this.status === "error") {
      return;
    }

    this.status = this.orderBook.hasBothSides ? "live" : "syncing";
  }

  protected markSyncing(): void {
    this.status = "syncing";
  }

  /**
   * 정규화된 체결을 받아 중복을 걸러 내고 집계와 큐에 넣는다.
   * 규모 등급은 이 거래소의 최근 체결량 백분위로만 정한다.
   */
  protected recordTrade(input: RecordTradeInput): void {
    if (!this.tradeIDCache.addIfAbsent(input.tradeID)) {
      return;
    }

    this.tradeSizeScale.addSample(input.sizeInBtc);
    this.tradeWindow.add(Date.now(), input.sizeInBtc, input.aggressorSide);

    this.tradeEventQueue.push({
      tradeID: input.tradeID,
      venue: this.venue,
      timestampInMs: input.sourceTimestampInMs,
      priceInQuote: input.priceInQuote,
      sizeInBtc: input.sizeInBtc,
      aggressorSide: input.aggressorSide,
      magnitude: this.tradeSizeScale.classifyMagnitude(input.sizeInBtc),
    });
  }
  //#endregion

  //#region [Transactions]
  /** 캔버스가 프레임마다 꺼내 가는 체결 이벤트. 꺼낸 만큼 큐에서 사라진다. */
  drainTrades(limit: number): TradeTick[] {
    return this.tradeEventQueue.drain(limit);
  }

  /** 소비되지 않은 이벤트를 버린다. 백그라운드 복귀 시 몰아치기를 막는다. */
  discardPendingTrades(): void {
    this.tradeEventQueue.clear();
  }

  getDiagnostics(): VenueDiagnostics {
    return { ...this.diagnostics };
  }

  /** 파생값 갱신. 정렬과 백분위처럼 비용이 있는 작업이라 커밋 주기에만 부른다. */
  refreshDerived(nowInMs: number): void {
    this.tradeWindow.prune(nowInMs);
    this.tradeSizeScale.refreshThresholds();

    const midPriceInQuote = this.orderBook.getMidPriceInQuote();

    if (midPriceInQuote > 0) {
      this.midPriceHistory.add(nowInMs, midPriceInQuote);
    }
  }

  /**
   * 현재 지표 스냅샷.
   *
   * 마지막 수신 시각이 오래됐으면 내부 상태와 무관하게 `stale` 로 보고한다.
   * 소켓이 조용히 죽어도 UI 가 옛 값을 살아 있는 값처럼 보여 주지 않게 하려는 것이다.
   */
  getMetrics(nowInMs: number): VenueMetrics {
    const midPriceInQuote = this.orderBook.getMidPriceInQuote();
    const bookImbalance = this.orderBook.getBookImbalance();
    const tradePressure = this.tradeWindow.getTradePressure();
    const momentum = calculateMomentum(
      midPriceInQuote,
      this.midPriceHistory.getReferencePriceInQuote(nowInMs),
    );

    return {
      venue: this.venue,
      status: this.resolveEffectiveStatus(nowInMs),
      midPriceInQuote,
      spreadInQuote: this.orderBook.getSpreadInQuote(),
      bestBidPriceInQuote: this.orderBook.bids.getBestPriceInQuote(),
      bestAskPriceInQuote: this.orderBook.asks.getBestPriceInQuote(),
      bookImbalance,
      tradePressure,
      momentum,
      venuePressure: calculateVenuePressure({ tradePressure, bookImbalance, momentum }),
      latencyInMs: this.latencyInMs,
      buyVolumeInBtc: this.tradeWindow.getBuyVolumeInBtc(),
      sellVolumeInBtc: this.tradeWindow.getSellVolumeInBtc(),
      lastMessageAtInMs: this.lastMessageAtInMs,
      lastOrderBookAtInMs: this.lastOrderBookAtInMs,
      lastTradeAtInMs: this.lastTradeAtInMs,
    };
  }

  /** 5초 창 안의 체결 건수. 초당 체결 수 표시에 쓴다. */
  getWindowTradeCount(): number {
    return this.tradeWindow.getTradeCount();
  }
  //#endregion
}
