import type ReconnectingWebSocket from "reconnecting-websocket";
import {
  isPlainObject,
  parseFiniteNumber,
  parseIdentifier,
  parseNonNegativeNumber,
  parsePositiveNumber,
} from "../lib/guards";
import { COINBASE_PRODUCT_ID, COINBASE_STREAM_URL } from "../model/constants";
import { VenueFeedBase } from "./venueFeedBase";

/** 연결 직후 5초 안에 구독해야 하므로 open 시점에 바로 보낸다. */
const SUBSCRIBED_CHANNELS = ["level2", "market_trades", "heartbeats"] as const;

/** ISO8601 문자열을 밀리초로. 실패하면 `null`. */
function parseIsoTimestampInMs(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const timestampInMs = Date.parse(value);

  return Number.isFinite(timestampInMs) ? timestampInMs : null;
}

/**
 * Coinbase Advanced Trade BTC-USD 커넥터.
 *
 * 공개 채널만 쓰므로 JWT 나 API 키가 없다. `level2` 는 첫 메시지로 스냅샷을 주고 이후
 * 갱신은 `price_level` 의 수량을 `new_quantity` 로 **교체**하는 방식이라, Binance 처럼
 * 누적 diff 를 맞출 필요가 없다. 대신 `sequence_num` 이 연결 단위로 1씩 증가하므로
 * 역행이나 누락이 보이면 재연결해 새 스냅샷을 기다린다.
 *
 * @see https://docs.cdp.coinbase.com/coinbase-business/advanced-trade-apis/websocket/websocket-channels
 */
export class CoinbaseFeed extends VenueFeedBase {
  private expectedSequenceNumber: number | null = null;
  private hasReceivedSnapshot = false;
  private lastHeartbeatAtInMs = 0;

  constructor() {
    super("coinbase");
  }

  //#region [Life Cycles]
  protected getStreamUrl(): string {
    return COINBASE_STREAM_URL;
  }

  protected subscribe(socket: ReconnectingWebSocket): void {
    for (const channelName of SUBSCRIBED_CHANNELS) {
      socket.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: [COINBASE_PRODUCT_ID],
          channel: channelName,
        }),
      );
    }
  }

  protected resetSyncState(): void {
    this.expectedSequenceNumber = null;
    this.hasReceivedSnapshot = false;
    this.lastHeartbeatAtInMs = 0;
  }
  //#endregion

  //#region [Privates]
  /** 마지막 하트비트 수신 시각. 진단 패널에서 연결이 살아 있는지 확인하는 데 쓴다. */
  getLastHeartbeatAtInMs(): number {
    return this.lastHeartbeatAtInMs;
  }

  /**
   * 연결 단위 시퀀스 검사.
   *
   * 값이 1씩 늘지 않으면 중간 메시지를 놓친 것이라 오더북을 믿을 수 없다.
   * 그 자리에서 메울 방법이 없으므로 재연결해 스냅샷부터 다시 받는다.
   */
  private isSequenceContinuous(message: Record<string, unknown>): boolean {
    const sequenceNumber = parseFiniteNumber(message.sequence_num);

    if (sequenceNumber === null) {
      return true;
    }

    if (this.expectedSequenceNumber !== null && sequenceNumber !== this.expectedSequenceNumber) {
      this.diagnostics.sequenceGapCount += 1;
      this.expectedSequenceNumber = null;
      this.hasReceivedSnapshot = false;
      this.forceReconnect();
      return false;
    }

    this.expectedSequenceNumber = sequenceNumber + 1;

    return true;
  }

  /** `bid` 는 매수, `offer` 는 매도. 수량 0 은 해당 가격 레벨 제거다. */
  private applyLevelUpdates(updates: unknown): void {
    if (!Array.isArray(updates)) {
      return;
    }

    for (const update of updates) {
      if (!isPlainObject(update)) {
        continue;
      }

      const priceInQuote = parsePositiveNumber(update.price_level);
      const sizeInBtc = parseNonNegativeNumber(update.new_quantity);

      if (priceInQuote === null || sizeInBtc === null) {
        this.diagnostics.parseErrorCount += 1;
        continue;
      }

      if (update.side === "bid") {
        this.orderBook.bids.applyLevel(priceInQuote, sizeInBtc);
        continue;
      }

      if (update.side === "offer") {
        this.orderBook.asks.applyLevel(priceInQuote, sizeInBtc);
      }
    }
  }

  private handleLevel2Event(event: Record<string, unknown>): void {
    if (event.product_id !== COINBASE_PRODUCT_ID) {
      return;
    }

    if (event.type === "snapshot") {
      this.orderBook.clear();
      this.applyLevelUpdates(event.updates);
      this.hasReceivedSnapshot = true;
      this.markSynchronized();
      return;
    }

    if (event.type !== "update") {
      return;
    }

    // 스냅샷을 못 받은 상태의 갱신은 기준점이 없어 적용해도 의미가 없다.
    if (!this.hasReceivedSnapshot) {
      this.markSyncing();
      return;
    }

    this.applyLevelUpdates(event.updates);
    this.markSynchronized();
  }

  /**
   * `market_trades.side` 는 **메이커** 쪽이다.
   * 메이커가 `SELL` 이면 테이커가 사 간 것이므로 공격 방향은 매수다.
   */
  private handleMarketTradesEvent(event: Record<string, unknown>): void {
    // 최초 snapshot은 과거 체결 100건이므로 실시간 압력과 애니메이션에 포함하지 않는다.
    if (event.type !== "update" || !Array.isArray(event.trades)) {
      return;
    }

    for (const trade of event.trades) {
      if (!isPlainObject(trade) || trade.product_id !== COINBASE_PRODUCT_ID) {
        continue;
      }

      const tradeID = parseIdentifier(trade.trade_id);
      const priceInQuote = parsePositiveNumber(trade.price);
      const sizeInBtc = parsePositiveNumber(trade.size);

      if (tradeID === null || priceInQuote === null || sizeInBtc === null) {
        this.diagnostics.parseErrorCount += 1;
        continue;
      }

      const tradeTimestampInMs = parseIsoTimestampInMs(trade.time) ?? Date.now();

      this.recordTrade({
        tradeID: `coinbase-${tradeID}`,
        timestampInMs: tradeTimestampInMs,
        priceInQuote,
        sizeInBtc,
        aggressorSide: trade.side === "SELL" ? "buy" : "sell",
      });
    }
  }

  protected handleParsedMessage(message: unknown): void {
    if (!isPlainObject(message)) {
      return;
    }

    if (message.type === "error") {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    if (!this.isSequenceContinuous(message)) {
      return;
    }

    const messageTimestampInMs = parseIsoTimestampInMs(message.timestamp);
    this.markMessageReceived(messageTimestampInMs ?? undefined);

    if (message.channel === "heartbeats") {
      this.lastHeartbeatAtInMs = Date.now();
      return;
    }

    if (!Array.isArray(message.events)) {
      return;
    }

    for (const event of message.events) {
      if (!isPlainObject(event)) {
        continue;
      }

      if (message.channel === "l2_data") {
        this.handleLevel2Event(event);
        continue;
      }

      if (message.channel === "market_trades") {
        this.handleMarketTradesEvent(event);
      }
    }
  }
  //#endregion
}
