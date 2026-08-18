"use client";

import { memo, useCallback, useMemo } from "react";
import { findLandmarkApartment, useApartmentSeriesQuery } from "@/entities/apartment";
import { resolveSelectedArea } from "../lib/buildChartSeries";
import useBtc2ApartmentStore from "../model/btc2ApartmentStore";
import ApartmentSelector from "./ApartmentSelector";
import ApartmentSummaryCard from "./ApartmentSummaryCard";
import AreaBucketTabs from "./AreaBucketTabs";
import Btc2ApartmentChart from "./Btc2ApartmentChart";

const Btc2ApartmentPanel = () => {
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
      <ApartmentSummaryCard
        landmark={landmark}
        yearPoints={series?.years ?? []}
        areaInSquareMeter={resolvedArea}
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
        onChangePriceUnit={setPriceUnit}
        isLoading={isLoading}
        hasIncompleteYear={hasIncompleteYear}
      />
      {ErrorTemplate}
      <ApartmentSelector selectedApartmentID={apartmentID} onSelectApartment={onSelectApartment} />
    </>
  );
};

const MemoizedBtc2ApartmentPanel = memo(Btc2ApartmentPanel);
MemoizedBtc2ApartmentPanel.displayName = "Btc2ApartmentPanel";

export default MemoizedBtc2ApartmentPanel;
