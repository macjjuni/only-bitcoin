import { memo, useMemo } from "react";
import "./TxFeeCard.scss";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";
import useStore from "@/shared/stores/store";
import { CountText } from "@/widgets";

const TxFeeCard = () => {

  // region [Hooks]

  const fees = useStore(state => state.fees);

  const feeDataList = useMemo(() => [
    { label: '최하위 순위', value: fees.economyFee },
    { label: '낮은 우선 순위', value: fees.hourFee },
    { label: '중간 우선 순위', value: fees.halfHourFee },
    { label: '높은 우선 순위', value: fees.fastestFee },
  ], [fees]);

  // endregion

  return (
    <HorizontalCard className="tx-fee-card__area" rows={1}>
      <div className="tx-fee-card__area__title">
        트렌잭션 수수료
      </div>
      <div className="tx-fee-card__area__content">
        {
          feeDataList.map(({label, value})=> (
            <div key={label} className="tx-fee-card__area__item">
              <div className="tx-fee-card__area__item__text">{label}</div>
              <div className="tx-fee-card__area__item__value">
                <CountText value={value} />
                <span className="tx-fee-card__area__item__value__unit">sat/vB</span>
              </div>
            </div>
          ))
        }
      </div>
    </HorizontalCard>
  );
};

export default memo(TxFeeCard);
