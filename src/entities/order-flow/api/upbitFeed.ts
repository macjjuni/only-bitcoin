import type ReconnectingWebSocket from "reconnecting-websocket";
import { generateUUID } from "@/shared/lib/uuid";
import { isPlainObject, parseFiniteNumber, parsePositiveNumber } from "../lib/guards";
import { UPBIT_MARKET_CODE, UPBIT_ORDERBOOK_DEPTH, UPBIT_STREAM_URL } from "../model/constants";
import { VenueFeedBase } from "./venueFeedBase";

/** JavaScript 안전 정수 범위를 넘는 `sequential_id`를 JSON 원문에서 손실 없이 읽는다. */
function extractSequentialID(rawText: string): string | null {
  const sequentialIDMatch = /"sequential_id"\s*:\s*(?:"(\d+)"|(\d+))/.exec(rawText);

  return sequentialIDMatch?.[1] ?? sequentialIDMatch?.[2] ?? null;
}

/**
 * Upbit KRW-BTC 커넥터.
 *
 * 호가는 매번 상위 30호가 **전량**을 보내므로 Binance 처럼 diff 를 누적하지 않는다.
 * 메시지 하나가 곧 현재 가시 오더북이라, 받을 때마다 통째로 교체한다. 늦게 도착한
 * 과거 메시지가 최신 상태를 덮어쓰지 않도록 timestamp 로 순서를 지킨다.
 *
 * @see https://docs.upbit.com/kr/reference/websocket-orderbook
 * @see https://docs.upbit.com/kr/reference/websocket-trade
 */
export class UpbitFeed extends VenueFeedBase {
  private lastOrderBookTimestampInMs = 0;

  constructor() {
    super("upbit");
  }

  //#region [Life Cycles]
  protected getStreamUrl(): string {
    return UPBIT_STREAM_URL;
  }

  /** ticket 은 연결마다 새로 만든다. 재연결 시 이전 구독과 섞이지 않게 하려는 것이다. */
  protected subscribe(socket: ReconnectingWebSocket): void {
    socket.send(
      JSON.stringify([
        { ticket: generateUUID() },
        { type: "orderbook", codes: [`${UPBIT_MARKET_CODE}.${UPBIT_ORDERBOOK_DEPTH}`] },
        { type: "trade", codes: [UPBIT_MARKET_CODE] },
        { format: "DEFAULT" },
      ]),
    );
  }

  protected resetSyncState(): void {
    this.lastOrderBookTimestampInMs = 0;
  }
  //#endregion

  //#region [Privates]
  /** `orderbook_units` 를 현재 가시 오더북으로 원자적으로 교체한다. */
  private handleOrderBookMessage(message: Record<string, unknown>): void {
    const orderBookTimestampInMs = parseFiniteNumber(message.timestamp) ?? Date.now();

    // 순서가 뒤바뀐 메시지는 버린다. 오래된 호가가 최신 호가를 덮으면 안 된다.
    if (orderBookTimestampInMs < this.lastOrderBookTimestampInMs) {
      return;
    }

    if (!Array.isArray(message.orderbook_units)) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    const bidLevels: Array<[number, number]> = [];
    const askLevels: Array<[number, number]> = [];

    for (const unit of message.orderbook_units) {
      if (!isPlainObject(unit)) {
        continue;
      }

      const bidPriceInQuote = parsePositiveNumber(unit.bid_price);
      const bidSizeInBtc = parsePositiveNumber(unit.bid_size);
      const askPriceInQuote = parsePositiveNumber(unit.ask_price);
      const askSizeInBtc = parsePositiveNumber(unit.ask_size);

      if (bidPriceInQuote !== null && bidSizeInBtc !== null) {
        bidLevels.push([bidPriceInQuote, bidSizeInBtc]);
      }

      if (askPriceInQuote !== null && askSizeInBtc !== null) {
        askLevels.push([askPriceInQuote, askSizeInBtc]);
      }
    }

    if (bidLevels.length === 0 || askLevels.length === 0) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    this.orderBook.bids.replaceAll(bidLevels);
    this.orderBook.asks.replaceAll(askLevels);
    this.lastOrderBookTimestampInMs = orderBookTimestampInMs;
    this.markMessageReceived(orderBookTimestampInMs);
    this.markSynchronized();
  }

  /** `ask_bid` 가 `BID` 면 매수 체결, `ASK` 면 매도 체결이다. */
  private handleTradeMessage(message: Record<string, unknown>, rawText: string): void {
    const tradeID = extractSequentialID(rawText);
    const priceInQuote = parsePositiveNumber(message.trade_price);
    const sizeInBtc = parsePositiveNumber(message.trade_volume);
    const tradeTimestampInMs = parseFiniteNumber(message.trade_timestamp);

    if (tradeID === null || priceInQuote === null || sizeInBtc === null) {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    if (message.ask_bid !== "BID" && message.ask_bid !== "ASK") {
      this.diagnostics.parseErrorCount += 1;
      return;
    }

    this.markMessageReceived(tradeTimestampInMs ?? undefined);

    this.recordTrade({
      tradeID: `upbit-${tradeID}`,
      timestampInMs: tradeTimestampInMs ?? Date.now(),
      priceInQuote,
      sizeInBtc,
      aggressorSide: message.ask_bid === "BID" ? "buy" : "sell",
    });
  }

  protected handleParsedMessage(message: unknown, rawText: string): void {
    if (!isPlainObject(message) || message.code !== UPBIT_MARKET_CODE) {
      return;
    }

    if (message.type === "orderbook") {
      this.handleOrderBookMessage(message);
      return;
    }

    if (message.type === "trade") {
      this.handleTradeMessage(message, rawText);
    }
  }
  //#endregion
}
