import { memo } from "react";
import "./TxFeeCard.scss";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";
import useStore from "@/shared/stores/store";

const TxFeeCard = () => {

  // region [Hooks]

  const fees = useStore(state => state.fees);

  // endregion

  return (
    <HorizontalCard className="tx-fee-card__area" rows={1}>
      <div className="tx-fee-card__area__title">
        트렌잭션 수수료
      </div>
      <div className="tx-fee-card__area__content">
      <div className="tx-fee-card__area__item">
        <div className="tx-fee-card__area__item__text">최하위</div>
        <div className="tx-fee-card__area__item__value">
          {fees.economyFee}
          <span className="tx-fee-card__area__item__value__unit">sat/vB</span>
        </div>
      </div>
      <div className="tx-fee-card__area__item">
      <div className="tx-fee-card__area__item__text">낮은 우선 순위</div>
        <div className="tx-fee-card__area__item__value">
          {fees.hourFee}
          <span className="tx-fee-card__area__item__value__unit">sat/vB</span>
        </div>
      </div>
      <div className="tx-fee-card__area__item">
        <div className="tx-fee-card__area__item__text">중간 우선 순위</div>
        <div className="tx-fee-card__area__item__value">
          {fees.halfHourFee}
          <span className="tx-fee-card__area__item__value__unit">sat/vB</span>
        </div>
      </div>
      <div className="tx-fee-card__area__item">
      <div className="tx-fee-card__area__item__text">높은 우선 순위</div>
        <div className="tx-fee-card__area__item__value">
          {fees.fastestFee}
          <span className="tx-fee-card__area__item__value__unit">sat/vB</span>
        </div>
      </div>
      </div>
    </HorizontalCard>
  );
};

export default memo(TxFeeCard);
