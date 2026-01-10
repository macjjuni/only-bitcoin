import { memo, useMemo } from "react";
import { KAccordion, KAccordionItem, KAccordionTrigger, KAccordionContent } from "kku-ui";
import { blockHalvingData } from "@/shared/constants/block";
import useStore from "@/shared/stores/store";


const HalvingDataCard = () => {
  // region [Templates]
  const currentBlockHeight = useStore((state) => state.blockData[0].height || 0);

  const nextHalvingIndex = useMemo(
    () => blockHalvingData.findIndex(({ blockHeight }) => blockHeight > currentBlockHeight),
    [currentBlockHeight]
  );

  const HalvingDataList = useMemo(
    () => [
      { label: "No.", items: blockHalvingData.map(({ date }, idx) => ({ value: idx + 1, key: date })) },
      { label: "날짜", items: blockHalvingData.map(({ date }) => ({ value: date, key: date })) },
      { label: "블록 높이", items: blockHalvingData.map(({ date, blockHeight }) => ({ value: blockHeight, key: date })) },
      { label: "보상(단위: btc)", items: blockHalvingData.map(({ blockReward, date }) => ({ value: blockReward, key: date })) },
    ],
    []
  );
  // endregion

  return (
    <KAccordion className="w-full" type="single" collapsible>
      <KAccordionItem value="Halving-Data" className="border-none">
        <KAccordionTrigger className="text-[18px] font-bold py-4">
          반감기 정보
        </KAccordionTrigger>
        <KAccordionContent className="overflow-x-auto pb-4">
          <ul className="flex flex-row">
            {HalvingDataList.map(({ label, items }) => (
              <div key={label} className="flex flex-col w-auto">
                {/* 헤더 레이블 */}
                <div className="whitespace-nowrap px-1.5 py-0.5 font-bold border-b border-border font-number">
                  {label}
                </div>
                {/* 데이터 리스트 */}
                {items.map(({ value, key }, idx) => {
                  const isActive = nextHalvingIndex === idx;
                  const isLast = idx === items.length - 1;

                  return (
                    <div
                      key={key}
                      className={[
                        "whitespace-nowrap px-1.5 py-0.5 font-number text-base transition-colors",
                        isLast ? "border-none" : "border-b border-border",
                        isActive ? "font-bold text-[#F7931A]" : "text-current",
                      ].join(" ")}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            ))}
          </ul>
        </KAccordionContent>
      </KAccordionItem>
    </KAccordion>
  );
};

const MemoizedHalvingDataCard = memo(HalvingDataCard);
MemoizedHalvingDataCard.displayName = "HalvingDataCard";

export default MemoizedHalvingDataCard;