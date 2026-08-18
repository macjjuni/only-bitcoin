"use client";

import { memo, useMemo } from "react";
import type { ApartmentYearPoint, LandmarkApartment } from "@/entities/apartment";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useMounted } from "@/shared/lib/hooks";
import { Card, CardContent } from "@/shared/ui";
import { formatBtcCount, formatKrwInEok } from "../lib/buildChartSeries";

interface ApartmentSummaryCardProps {
  landmark: LandmarkApartment | undefined;
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
}

const ApartmentSummaryCard = ({
  landmark,
  yearPoints,
  areaInSquareMeter,
}: ApartmentSummaryCardProps) => {
  // region [Hooks]
  const krwPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const isMounted = useMounted();
  // endregion

  // region [Privates]
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
      <span className="text-3xl font-bold text-bitcoin">
        {formatBtcCount(currentBtcCount)}
        <span className="ml-1 text-lg">BTC</span>
      </span>
    );
  }, [latestDeal, currentBtcCount, isMounted]);

  const SubtitleTemplate = useMemo(() => {
    if (!landmark) {
      return null;
    }

    const areaLabel = areaInSquareMeter === null ? "" : ` · 전용 ${areaInSquareMeter}㎡`;

    return (
      <span className="text-sm text-muted-foreground">
        {landmark.districtName} {landmark.legalDongName}
        {areaLabel}
      </span>
    );
  }, [landmark, areaInSquareMeter]);

  const LatestDealTemplate = useMemo(() => {
    if (!latestDeal) {
      return (
        <span className="text-xs text-muted-foreground">실거래 데이터를 불러오는 중이에요.</span>
      );
    }

    return (
      <span className="text-xs text-muted-foreground">
        {latestDeal.year}년 중앙값 {formatKrwInEok(latestDeal.priceInKrw)}억 기준
      </span>
    );
  }, [latestDeal]);
  // endregion

  return (
    <Card className="font-number">
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-base font-bold">{landmark?.displayName ?? "-"}</span>
        {SubtitleTemplate}
        <div className="mt-2 flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">지금 사려면</span>
          {HeadlineTemplate}
          {LatestDealTemplate}
        </div>
      </CardContent>
    </Card>
  );
};

const MemoizedApartmentSummaryCard = memo(ApartmentSummaryCard);
MemoizedApartmentSummaryCard.displayName = "ApartmentSummaryCard";

export default MemoizedApartmentSummaryCard;
