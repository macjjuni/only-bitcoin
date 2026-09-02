"use client";

import type { ReactNode } from "react";
import { type OrderFlowSnapshot, VENUE_IDS, VENUE_LABELS } from "@/entities/order-flow";
import {
  formatBtcAmount,
  formatElapsedSince,
  formatLatency,
  formatPriceInQuote,
  formatSpreadInQuote,
  STATUS_TEXTS,
} from "../lib/formatWarValues";

interface WarDiagnosticsPanelProps {
  snapshot: OrderFlowSnapshot;
  activeObjectCount: number;
}

/**
 * 진단 패널.
 *
 * 화면이 이상해 보일 때 원인이 어디인지 바로 짚을 수 있게 원자료를 그대로 늘어놓는다.
 * 재연결·재동기화·시퀀스 누락 횟수는 커넥터가 실제로 겪은 사건 수라 조용한 장애를 드러낸다.
 */
export function WarDiagnosticsPanel({
  snapshot,
  activeObjectCount,
}: WarDiagnosticsPanelProps): ReactNode {
  return (
    <section
      className="border-t border-dashed border-neutral-400/50 pt-2.5 dark:border-neutral-600"
      aria-label="진단 정보"
    >
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <span className="font-bold">Diagnostics</span>
        <span className="font-number">
          objects {activeObjectCount.toLocaleString()} · trades{" "}
          {snapshot.tradesPerSecond.toFixed(1)}
          /s
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {VENUE_IDS.map((venue) => {
          const venueMetrics = snapshot.venues[venue];
          const venueDiagnostics = snapshot.diagnostics[venue];

          return (
            <div
              key={venue}
              className="rounded-lg bg-neutral-200/40 p-2 text-[11px] dark:bg-neutral-800/60"
            >
              <div className="mb-1 flex items-center justify-between font-bold">
                <span>{VENUE_LABELS[venue].name}</span>
                <span className="text-muted-foreground">{STATUS_TEXTS[venueMetrics.status]}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                <dt>Best Bid</dt>
                <dd className="text-right">
                  {formatPriceInQuote(venue, venueMetrics.bestBidPriceInQuote)}
                </dd>
                <dt>Best Ask</dt>
                <dd className="text-right">
                  {formatPriceInQuote(venue, venueMetrics.bestAskPriceInQuote)}
                </dd>
                <dt>Spread</dt>
                <dd className="text-right">
                  {formatSpreadInQuote(venue, venueMetrics.spreadInQuote)}
                </dd>
                <dt>Book Imbalance</dt>
                <dd className="text-right">{venueMetrics.bookImbalance.toFixed(3)}</dd>
                <dt>5초 매수</dt>
                <dd className="text-right">{formatBtcAmount(venueMetrics.buyVolumeInBtc)} BTC</dd>
                <dt>5초 매도</dt>
                <dd className="text-right">{formatBtcAmount(venueMetrics.sellVolumeInBtc)} BTC</dd>
                <dt>오더북 수신</dt>
                <dd className="text-right">
                  {formatElapsedSince(venueMetrics.lastOrderBookAtInMs, snapshot.updatedAtInMs)}
                </dd>
                <dt>체결 수신</dt>
                <dd className="text-right">
                  {formatElapsedSince(venueMetrics.lastTradeAtInMs, snapshot.updatedAtInMs)}
                </dd>
                <dt>소켓 수신</dt>
                <dd className="text-right">
                  {formatElapsedSince(venueMetrics.lastMessageAtInMs, snapshot.updatedAtInMs)}
                </dd>
                <dt>수신 지연</dt>
                <dd className="text-right">{formatLatency(venueMetrics.latencyInMs)}</dd>
                <dt>재연결 / 재동기화</dt>
                <dd className="text-right">
                  {venueDiagnostics.reconnectCount} / {venueDiagnostics.resyncCount}
                </dd>
                <dt>Sequence Gap / 파싱 오류</dt>
                <dd className="text-right">
                  {venueDiagnostics.sequenceGapCount} / {venueDiagnostics.parseErrorCount}
                </dd>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
