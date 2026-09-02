"use client";

import { type ReactNode, useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { type OrderFlowSnapshot, VENUE_IDS, VENUE_LABELS } from "@/entities/order-flow";
import { calculateAveragePrice } from "../lib/calculateAveragePrice";
import {
  formatExchangeRate,
  formatPressurePercent,
  STATUS_BADGE_CLASSES,
  STATUS_TEXTS,
  toBuySharePercent,
} from "../lib/formatWarValues";
import { useThrottledAveragePrice } from "../lib/hooks/useThrottledAveragePrice";
import { VENUE_ACCENT_RGB } from "../model/warViewModel";
import { AveragePriceLine } from "./AveragePriceLine";
import { KimchiPremiumBadge } from "./KimchiPremiumBadge";
import { PressureGauge } from "./PressureGauge";

/**
 * 평균가 표시 갱신 간격.
 *
 * `CountText` 의 기본 애니메이션이 0.3초라 그보다 넉넉히 길어야 숫자가 다 굴러간 뒤
 * 다음 값으로 넘어간다.
 */
const AVERAGE_PRICE_TICK_INTERVAL_IN_MS = 1000;

/** 구획을 나누는 가로선. 카드 안에서 세 덩이가 각자 읽히게 한다. */
const SECTION_DIVIDER_CLASS =
  "mt-3 border-t-[0.75px] border-neutral-300 pt-3 dark:border-neutral-600";

/** 구획 제목. 세 덩이가 같은 크기로 서야 나란한 항목으로 읽힌다. */
const SECTION_LABEL_CLASS =
  "text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground";

interface WarHudProps {
  snapshot: OrderFlowSnapshot;
}

/**
 * 통합 텍스트 HUD.
 *
 * 전장이 세 거래소를 합친 하나의 화면이므로 HUD 도 통합 압력과 평균가만 보여 준다.
 * 거래소는 평균에 참여하고 있는지( 연결 상태 )만 한 줄로 압축하고, 거래소별 원본 가격과
 * 지연 같은 원자료는 진단 패널에서 본다.
 */
export function WarHud({ snapshot }: WarHudProps): ReactNode {
  //#region [Hooks]
  /**
   * 앱 전역 원·달러 환율.
   *
   * 루트 `Initializer` 가 항상 채우고 로컬 스토리지에 남기므로 이 화면이 따로 API 를
   * 부르지 않는다. 통화가 다른 세 거래소를 평균내려면 기준 통화를 맞춰야 해서 필요하다.
   */
  const exRate = useBitcoinStore((store) => store.exRate);

  const liveAveragePrice = useMemo(
    () => calculateAveragePrice(snapshot, exRate.value),
    [snapshot, exRate.value],
  );

  /** 화면에 보이는 값. 캡션도 이 값을 설명해야 하므로 함께 스로틀링된 쪽을 쓴다. */
  const averagePrice = useThrottledAveragePrice(
    liveAveragePrice,
    AVERAGE_PRICE_TICK_INTERVAL_IN_MS,
  );
  //#endregion

  //#region [Templates]
  const buySharePercent = useMemo(
    () => toBuySharePercent(snapshot.aggregatePressure),
    [snapshot.aggregatePressure],
  );

  const isBuyDominant = snapshot.aggregatePressure >= 0;

  /**
   * 압력 방향 색.
   *
   * 평균가에도 같은 색을 쓴다. 숫자 자체는 압력과 무관하지만, 지금 어느 쪽이 밀고 있는지를
   * 화면 위아래가 같은 신호로 말해야 한 눈에 읽힌다.
   */
  const pressureColorClass = isBuyDominant ? "text-up" : "text-down";

  /** 평균가 아래에 붙는 설명. 몇 개 거래소가 들어갔는지와 환산 기준을 밝힌다. */
  const averagePriceCaption = useMemo((): string => {
    if (averagePrice.includedVenues.length === 0) {
      return "거래소 연결 대기 중";
    }

    const venueCountText = `${averagePrice.includedVenues.length}개 거래소 평균`;

    if (!averagePrice.hasExchangeRate) {
      return `${venueCountText} · 환율 대기 중`;
    }

    return `${venueCountText} · 환율 ${formatExchangeRate(exRate.value)}`;
  }, [averagePrice, exRate.value]);
  //#endregion

  return (
    <section
      className="overflow-hidden rounded-xl border-[0.75px] border-neutral-300 bg-gradient-to-r from-up/[0.06] via-transparent to-down/[0.06] p-4 backdrop-blur-sm dark:border-neutral-600"
      aria-label="통합 압력과 거래소 평균가"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className={SECTION_LABEL_CLASS}>Total Pressure</span>
        <span className={`font-number text-2xl font-bold ${pressureColorClass}`}>
          {isBuyDominant ? "BUY " : "SELL "}
          {formatPressurePercent(snapshot.aggregatePressure)}
        </span>
      </div>

      <PressureGauge pressure={snapshot.aggregatePressure} />

      {/*
        게이지 양 끝 점유율.
        우세한 쪽만 진영 색으로 세워, 막대를 보지 않고 숫자만 훑어도 방향이 읽히게 한다.
      */}
      <div className="mt-1.5 flex items-baseline justify-between font-number text-[11px] font-bold">
        <span className={isBuyDominant ? "text-up" : "text-muted-foreground"}>
          매수 {buySharePercent.toFixed(0)}%
        </span>
        <span className={isBuyDominant ? "text-muted-foreground" : "text-down"}>
          매도 {(100 - buySharePercent).toFixed(0)}%
        </span>
      </div>

      <div className={SECTION_DIVIDER_CLASS}>
        <span className={SECTION_LABEL_CLASS}>Average Price</span>

        {/* 이름 열과 값 열이 줄마다 맞아떨어지도록 격자로 둔다. */}
        <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
          <AveragePriceLine
            label="원화"
            currencySymbol="₩"
            price={averagePrice.averagePriceInKrw}
            colorClass={pressureColorClass}
            emphasis="primary"
            suffixTemplate={
              <KimchiPremiumBadge premiumPercent={averagePrice.kimchiPremiumPercent} />
            }
          />
          <AveragePriceLine
            label="달러"
            currencySymbol="$"
            price={averagePrice.averagePriceInUsd}
            colorClass={pressureColorClass}
            emphasis="secondary"
          />
        </dl>

        <p className="mt-1.5 text-[11px] text-muted-foreground">{averagePriceCaption}</p>
      </div>

      <ul className={`flex flex-wrap gap-1.5 ${SECTION_DIVIDER_CLASS}`}>
        {VENUE_IDS.map((venue) => {
          const venueStatus = snapshot.venues[venue].status;
          const isIncluded = averagePrice.includedVenues.includes(venue);

          return (
            <li
              key={venue}
              className={`flex items-center gap-1.5 rounded-md bg-neutral-200/70 py-1 pl-2 pr-1 text-[11px] dark:bg-neutral-800/60 ${
                isIncluded ? "" : "opacity-45"
              }`}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `rgb(${VENUE_ACCENT_RGB[venue]})` }}
              />
              <span className="font-bold">{VENUE_LABELS[venue].name}</span>
              <span
                className={`rounded px-1.5 py-0.5 font-bold ${STATUS_BADGE_CLASSES[venueStatus]}`}
              >
                {STATUS_TEXTS[venueStatus]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
