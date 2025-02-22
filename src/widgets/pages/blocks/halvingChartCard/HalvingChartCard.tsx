import { useCallback, useEffect, useMemo, useState } from "react";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";
import "./HalvingChartCard.scss";
import useStore from "@/shared/stores/store";
import { calcPercentage, getNextHalvingData } from "@/shared/utils/common";
import CountText from "@/widgets/countText/CountText";
import { calcDate } from "@/shared/utils/date";


const circumference = 2 * Math.PI * 50; // 원의 둘레

const HalvingChartCard = () => {


  // region [Hooks]

  const currentBlockData = useStore(state => state.blockData[0]);
  const currentBlockHeight = useMemo(() => (currentBlockData.height), [currentBlockData]);
  const nextHalvingData = useMemo(() => getNextHalvingData(currentBlockData.height), [currentBlockData]);
  const restBlockCount = useMemo(() => (nextHalvingData.blockHeight - currentBlockData.height), [nextHalvingData, currentBlockData]);
  const halvingPercent = useMemo(() => calcPercentage(nextHalvingData.blockHeight, currentBlockData.height), [nextHalvingData, currentBlockData]);
  const expectNextHalvingDate = useMemo(() => calcDate(Date.now(), restBlockCount * 10, "minute", "YYYY.MM.DD"), [restBlockCount]);
  const [offset, setOffset] = useState<number>(312);

  // endregion


  // region [Privates]

  const initializeOffset = useCallback(() => {

    setOffset(circumference - (halvingPercent / 100) * circumference);
  }, [halvingPercent]);

  // endregion


  // region [Templates]

  const CircleChart = useMemo(() => (
    <svg className="halving-chart-card__area__content__chart" width="60%" viewBox="0 0 120 120">
      {/* 배경 원 */}
      <circle cx="60" cy="60" r="50" stroke="#4f4f4f" strokeWidth="16" fill="none" />
      {/* 진행 원 */}
      <circle cx="60" cy="60" r="50" stroke="#fff" strokeWidth="16" fill="none"
              strokeDasharray={circumference} strokeDashoffset={offset}
              transform="rotate(-90 60 60)" />
      {/* 퍼센트 텍스트 */}
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="18" fontWeight="bold" fill="#fff">
        {halvingPercent}%
      </text>
    </svg>
  ), [halvingPercent, offset]);

  const HalvingDataList = useMemo(() => ([
    { label: "현재 블록 높이", value: currentBlockHeight, isCount: true },
    { label: "남은 블록 높이", value: restBlockCount, isCount: true },
    { label: "다음 반감기 블록 높이", value: nextHalvingData.blockHeight, isCount: true },
    { label: "다음 반감기 예상 날짜", value: expectNextHalvingDate, isCount: false }
  ]), [currentBlockHeight, restBlockCount, nextHalvingData, expectNextHalvingDate]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    initializeOffset();
  }, [halvingPercent]);

  // endregion




  return (
    <HorizontalCard rows={1} className="halving-chart-card__area">

      <div className="halving-chart-card__area__title">반감기 현황</div>

      <div className="halving-chart-card__area__content">

        {CircleChart}

        <div className="halving-chart-card__area__content__data-view">
          {HalvingDataList.map(data => (
            <div key={data.label} className="halving-chart-card__area__content__data-view__item">
              <div className="halving-chart-card__area__content__data-view__item__label">
                {data.label}
              </div>
              <div className="halving-chart-card__area__content__data-view__item__value">
                {data.isCount && <CountText value={data.value as number} />}
                {!data.isCount && data.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </HorizontalCard>
  );
};

export default HalvingChartCard;
