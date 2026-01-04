import { Fragment, memo, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { CountText } from "@/components";


const BlockTxFees = () => {

  // region [Hooks]
  const fees = useStore(state => state.fees);
  const feeDataList = useMemo(() => [
    { label: "최하위 순위", value: fees.economyFee },
    { label: "낮은 우선 순위", value: fees.hourFee },
    { label: "중간 우선 순위", value: fees.halfHourFee },
    { label: "높은 우선 순위", value: fees.fastestFee }
  ], [fees]);
  // endregion

  return (
    <div className="flex flex-col justify-between gap-3 border-none">
      <div className="flex justify-between items-end">
        <h2 className="text-[18px] font-bold">트랜잭션 수수료</h2>
      </div>

      <div className="flex justify-between items-center gap-2 pr-1">
        {feeDataList.map(({ label, value }, idx) => (
          <Fragment key={label}>
            <div className="flex flex-col w-[22%]">
              <span className="text-[13px] opacity-80 tracking-[-1px] whitespace-nowrap">
                {label}
              </span>
              <span className="font-number font-bold text-lg">
                <CountText value={value} decimals={1} />
                <span className="text-xs font-normal pl-[2px] tracking-[-0.5px]">sat/vB</span>
              </span>
            </div>

            {/* Divider */}
            {idx !== feeDataList.length - 1 && (
              <div className="w-px h-9 bg-current opacity-70" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const MemoizedBlockTxFees = memo(BlockTxFees);
MemoizedBlockTxFees.displayName = "BlockTxFees";
BlockTxFees.display = "BlockTxFees";

export default MemoizedBlockTxFees;