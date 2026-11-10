"use client";

import { memo, useMemo } from "react";
import type { ApartmentYearPoint, LandmarkApartment } from "@/entities/apartment";
import { useBitcoinStore } from "@/entities/bitcoin";
import { buildApartmentShareStats } from "@/features/btc2apartment-share";
import { useMounted } from "@/shared/lib/hooks";
import { formatBtcCount, formatKrwInEok } from "../lib/buildChartSeries";

interface ApartmentSummaryCardProps {
  landmark: LandmarkApartment | undefined;
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
}

interface TrendRowProps {
  label: string;
  baseLabel: string;
  currentLabel: string;
  /** 처음 대비 지금이 몇 배인지. 1 보다 크면 비싸진 것. */
  changeMultiple: number;
  /** 싸졌을 때 쓸 색. 비싸졌을 때는 항상 하락색( 빨강 )을 씀. */
  cheaperClassName: string;
}

// region [Privates]
/** `1.6배` 처럼 쓸 배수 표기. 값이 크면 소수를 버림. */
const formatMultiple = (multiple: number): string => {
  return multiple >= 100 ? multiple.toFixed(0) : multiple.toFixed(1);
};
// endregion

/**
 * 같은 기간의 가격 변화 한 줄.
 * 비싸졌으면 ▲ 와 지금 ÷ 처음, 싸졌으면 ▼ 와 처음 ÷ 지금을 보여 줌. 배수는 항상 1 이상으로 읽히게 함.
 */
function TrendRow({
  label,
  baseLabel,
  currentLabel,
  changeMultiple,
  cheaperClassName,
}: TrendRowProps) {
  // region [Privates]
  const isMoreExpensive = changeMultiple >= 1;
  const displayMultiple = isMoreExpensive ? changeMultiple : 1 / changeMultiple;
  const badgeClassName = isMoreExpensive ? "text-down" : cheaperClassName;
  // endregion

  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-sm font-bold text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-3 text-sm font-bold">
        <span className="font-number whitespace-nowrap">
          {baseLabel} → {currentLabel}
        </span>
        <span className={`w-[64px] whitespace-nowrap text-right ${badgeClassName}`}>
          {isMoreExpensive ? "▲" : "▼"}{" "}
          <span className="font-number">{formatMultiple(displayMultiple)}</span>배
        </span>
      </dd>
    </div>
  );
}

const ApartmentSummaryCard = ({
  landmark,
  yearPoints,
  areaInSquareMeter,
}: ApartmentSummaryCardProps) => {
  // region [Hooks]
  const krwPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const isMounted = useMounted();

  /** 가장 최근에 거래가 있었던 해의 대표 가격 */
  const latestDeal = useMemo(() => {
    if (areaInSquareMeter === null) {
      return null;
    }

    for (let index = yearPoints.length - 1; index >= 0; index -= 1) {
      const bucket = yearPoints[index].areaBuckets.find(
        (areaBucket) => areaBucket.areaInSquareMeter === areaInSquareMeter,
      );

      if (bucket?.medianPriceInKrw) {
        return { year: yearPoints[index].year, priceInKrw: bucket.medianPriceInKrw };
      }
    }

    return null;
  }, [yearPoints, areaInSquareMeter]);

  /**
   * 헤드라인만 **실시간** 시세를 쓴다.
   * 차트의 과거 막대는 각 거래일 시세로 환산하므로 이 값과 무관하다.
   */
  const currentBtcCount = useMemo(() => {
    if (!latestDeal || krwPrice <= 0) {
      return null;
    }

    return latestDeal.priceInKrw / krwPrice;
  }, [latestDeal, krwPrice]);

  /**
   * 같은 기간을 원화와 BTC 로 나란히 본 변화. 공유 카드와 같은 계산을 씀.
   * 실시간 시세가 들어가서 마운트 전에는 안 그림. 서버 렌더와 값이 달라짐.
   */
  const trendStats = useMemo(() => {
    if (!isMounted) {
      return null;
    }

    return buildApartmentShareStats({
      yearPoints,
      areaInSquareMeter,
      bitcoinPriceInKrw: krwPrice,
    });
  }, [isMounted, yearPoints, areaInSquareMeter, krwPrice]);
  // endregion

  // region [Templates]
  const HeadlineTemplate = useMemo(() => {
    if (!latestDeal) {
      return <span className="text-2xl font-bold text-muted-foreground">—</span>;
    }

    if (!isMounted || currentBtcCount === null) {
      return <span className="text-2xl font-bold text-muted-foreground">계산 중…</span>;
    }

    return (
      <span className="font-number text-4xl font-black leading-none text-bitcoin">
        {formatBtcCount(currentBtcCount)}
        <span className="ml-1.5 text-lg font-bold">BTC</span>
      </span>
    );
  }, [latestDeal, currentBtcCount, isMounted]);

  const LatestDealTemplate = useMemo(() => {
    if (!latestDeal) {
      return (
        <span className="text-xs text-muted-foreground">실거래 데이터를 불러오는 중이에요.</span>
      );
    }

    return (
      <span className="text-xs text-muted-foreground">
        {areaInSquareMeter !== null && (
          <>
            전용 <span className="font-number">{areaInSquareMeter}</span>㎡ ·{" "}
          </>
        )}
        <span className="font-number">{latestDeal.year}</span>년 중앙값{" "}
        <span className="font-number">{formatKrwInEok(latestDeal.priceInKrw)}</span>억 기준
      </span>
    );
  }, [latestDeal, areaInSquareMeter]);

  /** 원화와 BTC 로 본 같은 기간의 변화. 이 화면이 말하려는 비교라 큰 숫자 바로 아래에 둠. */
  const TrendTemplate = useMemo(() => {
    if (!trendStats) {
      return null;
    }

    return (
      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2.5 text-xs text-muted-foreground">
          <span className="font-number">{trendStats.baseYear}</span>년 →{" "}
          <span className="font-number">{trendStats.latestYear}</span>년, 같은 집의 가격
        </p>
        <dl className="flex flex-col gap-2">
          <TrendRow
            label="원화로는"
            baseLabel={`${formatKrwInEok(trendStats.krw.baseValue)}억`}
            currentLabel={`${formatKrwInEok(trendStats.krw.currentValue)}억`}
            changeMultiple={trendStats.krw.currentValue / trendStats.krw.baseValue}
            cheaperClassName="text-up"
          />
          <TrendRow
            label="비트코인으로는"
            baseLabel={`${formatBtcCount(trendStats.btc.baseValue)}개`}
            currentLabel={`${formatBtcCount(trendStats.btc.currentValue)}개`}
            changeMultiple={trendStats.btc.currentValue / trendStats.btc.baseValue}
            cheaperClassName="text-bitcoin"
          />
        </dl>
      </div>
    );
  }, [trendStats]);
  // endregion

  return (
    <section className="card-surface card-surface-accent flex flex-col p-4">
      {/* 단지 이름과 위치는 바로 위 선택 버튼이 보여 줌. 여기서 또 쓰면 같은 말이 두 번 나옴. */}
      <h2 className="sr-only">{landmark?.displayName ?? "선택한 단지"} 비트코인 환산</h2>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-muted-foreground">지금 사려면</span>
        {HeadlineTemplate}
        {LatestDealTemplate}
      </div>
      {TrendTemplate}
    </section>
  );
};

const MemoizedApartmentSummaryCard = memo(ApartmentSummaryCard);
MemoizedApartmentSummaryCard.displayName = "ApartmentSummaryCard";

export default MemoizedApartmentSummaryCard;
