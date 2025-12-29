import { memo, useCallback, useEffect, useMemo, useState } from "react";
import useStore from "@/shared/stores/store";
import CountText from "@/components/ui/CountText";
import { calcPercentage, getNextHalvingData } from "@/shared/utils/calculate";
import { calcDate } from "@/shared/lib/date";


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
    <svg className="w-[64%] h-auto" viewBox="0 0 120 120">
      {/* 배경 원: 라이트/다크 모드 색상 분리 */}
      <circle
        cx="60" cy="60" r="50"
        stroke="currentColor"
        className="text-[#ededed] dark:text-white/20"
        strokeWidth="16" fill="none"
      />
      {/* 진행 원: Bitcoin Color 적용 및 transition 추가 */}
      <circle
        cx="60" cy="60" r="50"
        stroke="#f7931a"
        strokeWidth="16.4"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-[1200ms] ease-in-out"
        transform="rotate(-90 60 60)"
      />
      {/* 퍼센트 텍스트: text-current로 테마 대응 */}
      <text
        x="50%" y="50%" textAnchor="middle" dy=".3em"
        fontSize="18" fontWeight="bold"
        className="fill-current"
      >
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
  useEffect(initializeOffset, [halvingPercent]);
  // endregion

  return (
    <div className="flex flex-col gap-4 py-1">
      <div className="text-[18px] font-bold">반감기 현황</div>

      <div className="flex justify-between items-start gap-6">
        {CircleChart}

        <div className="flex flex-col items-start justify-between w-1/2 min-h-full self-stretch">
          {HalvingDataList.map(data => (
            <div key={data.label} className="flex flex-col gap-0.5">
              <div className="text-sm opacity-80 whitespace-nowrap">
                {data.label}
              </div>
              <div className="text-[18px] font-bold leading-none font-number">
                {data.isCount ? <CountText value={data.value as number} /> : data.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MemoizedHalvingChartCard = memo(HalvingChartCard);
MemoizedHalvingChartCard.displayName = "HalvingChartCard";
HalvingChartCard.displayName = "HalvingChartCard";

export default MemoizedHalvingChartCard;
