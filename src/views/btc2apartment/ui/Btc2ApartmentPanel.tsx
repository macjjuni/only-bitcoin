"use client";

import { memo, useCallback, useMemo } from "react";
import { findLandmarkApartment, useApartmentSeriesQuery } from "@/entities/apartment";
import { Card, CardContent } from "@/shared/ui";
import { resolveSelectedArea } from "../lib/buildChartSeries";
import useBtc2ApartmentStore from "../model/btc2ApartmentStore";
import ApartmentSelector from "./ApartmentSelector";
import ApartmentSummaryCard from "./ApartmentSummaryCard";
import AreaBucketTabs from "./AreaBucketTabs";
import Btc2ApartmentChart from "./Btc2ApartmentChart";
import DataSourceFooter from "./DataSourceFooter";

interface Btc2ApartmentPanelProps {
  /**
   * 아카이브 생성일. 서버 컴포넌트에서 내려받는다.
   *
   * `archive.json` 을 클라이언트에서 직접 import 하면 90KB 짜리 확정 연도 집계가
   * 통째로 번들에 실린다. 필요한 것은 날짜 한 줄뿐이므로 prop 으로 받는다.
   */
  archiveGeneratedAt: string;
}

const Btc2ApartmentPanel = ({ archiveGeneratedAt }: Btc2ApartmentPanelProps) => {
  // region [Hooks]
  const apartmentID = useBtc2ApartmentStore((state) => state.apartmentID);
  const priceUnit = useBtc2ApartmentStore((state) => state.priceUnit);
  const selectedAreaInSquareMeter = useBtc2ApartmentStore(
    (state) => state.selectedAreaInSquareMeter,
  );
  const setApartmentID = useBtc2ApartmentStore((state) => state.setApartmentID);
  const setPriceUnit = useBtc2ApartmentStore((state) => state.setPriceUnit);
  const setSelectedArea = useBtc2ApartmentStore((state) => state.setSelectedArea);

  const landmark = useMemo(() => findLandmarkApartment(apartmentID), [apartmentID]);

  const { series, isLoading, isError, hasIncompleteYear } = useApartmentSeriesQuery(landmark);
  // endregion

  // region [Privates]
  /**
   * 실제로 그릴 평형.
   * 사용자가 고른 평형이 이 단지에 없으면 기본 평형으로 되돌린다.
   */
  const resolvedArea = useMemo(
    () =>
      resolveSelectedArea(
        series?.availableAreas ?? [],
        selectedAreaInSquareMeter,
        series?.defaultAreaInSquareMeter,
      ),
    [series, selectedAreaInSquareMeter],
  );
  // endregion

  // region [Events]
  const onSelectApartment = useCallback(
    (nextApartmentID: string) => {
      setApartmentID(nextApartmentID);
    },
    [setApartmentID],
  );

  const onSelectArea = useCallback(
    (areaInSquareMeter: number) => {
      setSelectedArea(areaInSquareMeter);
    },
    [setSelectedArea],
  );
  // endregion

  // region [Templates]
  const ErrorTemplate = useMemo(() => {
    if (!isError) {
      return null;
    }

    return (
      <span className="px-1 text-xs text-down">
        실거래 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
      </span>
    );
  }, [isError]);
  // endregion

  return (
    <>
      <ApartmentSelector selectedApartmentID={apartmentID} onSelectApartment={onSelectApartment} />
      <Card>
        <CardContent className="flex flex-col gap-4 px-4 py-3">
          <ApartmentSummaryCard
            landmark={landmark}
            yearPoints={series?.years ?? []}
            areaInSquareMeter={resolvedArea}
            priceUnit={priceUnit}
            onChangePriceUnit={setPriceUnit}
          />
          <AreaBucketTabs
            availableAreas={series?.availableAreas ?? []}
            selectedAreaInSquareMeter={resolvedArea}
            onSelectArea={onSelectArea}
          />
          <Btc2ApartmentChart
            yearPoints={series?.years ?? []}
            areaInSquareMeter={resolvedArea}
            priceUnit={priceUnit}
            isLoading={isLoading}
            hasIncompleteYear={hasIncompleteYear}
          />
          {ErrorTemplate}
        </CardContent>
      </Card>
      <DataSourceFooter archiveGeneratedAt={archiveGeneratedAt} />
    </>
  );
};

const MemoizedBtc2ApartmentPanel = memo(Btc2ApartmentPanel);
MemoizedBtc2ApartmentPanel.displayName = "Btc2ApartmentPanel";

export default MemoizedBtc2ApartmentPanel;
