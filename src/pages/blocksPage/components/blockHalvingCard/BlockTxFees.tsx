import { Fragment, memo, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { CountText } from "@/components";
import "./BlockTxFees.scss";


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
    <div className="tx-fee-card">

      <div className="tx-fee-card__header">
        <h2 className="tx-fee-card__header__title">트랜잭션 수수료</h2>
      </div>

      <div className="tx-fee-card__info">
        {
          feeDataList.map(({ label, value }, idx) => (
            <Fragment key={label}>
              <div className="tx-fee-card__info__info-item">
                <span className="tx-fee-card__info__info-item__label">{label}</span>
                <span className="tx-fee-card__info__info-item__value">
                  <CountText value={value} decimals={1} />
                  <span className="unit">sat/vB</span>
                </span>
              </div>
              {idx !== feeDataList.length - 1 && (<div className="tx-fee-card__info__info-item__divider" />)}
            </Fragment>
          ))
        }
      </div>
    </div>
  );
};

const MemoizedBlockTxFees = memo(BlockTxFees);
MemoizedBlockTxFees.displayName = "BlockTxFees";
BlockTxFees.display = "BlockTxFees";

export default MemoizedBlockTxFees;