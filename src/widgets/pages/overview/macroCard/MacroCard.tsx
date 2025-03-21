import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";
import { calcPremiumPercent } from "@/shared/utils/common";
import useStore from "@/shared/stores/store";
import { FearAndGreedModal } from "@/widgets/modal";
import "./MacroCard.scss";
import { CountText } from "@/widgets";
import { useBitcoinDominanceQuery } from "@/shared/api";


const PricePannel = () => {

  // region [Hooks]

  const { dominance } = useBitcoinDominanceQuery();
  const { krw, usd } = useStore(state => state.bitcoinPrice);
  const usdExRate = useStore(state => state.exRate.value);
  const feerGreed = useStore(state => state.fearGreed.value);
  const premium = useMemo(() => (calcPremiumPercent(krw, usd, usdExRate)), [krw, usd, usdExRate]);

  const navigate = useNavigate();
  const [IsFeerAndGreedModal, setIsFeerAndGreedModal] = useState(false);

  // endregion


  // region [Privates]

  const onRoutePremiumPage = useCallback(() => {
    navigate("/premium");
  }, []);

  // endregion


  // region [Events]

  const onCloseFeerAndGreedModal = useCallback(() => {
    setIsFeerAndGreedModal(false);
  }, []);

  const onOpenFeerAndGreedModal = useCallback(() => {
    setIsFeerAndGreedModal(true);
  }, []);

  // endregion


  // region [Templates]

  const macroDataList = useMemo(() => (
    [
      { label: "BTC.D", value: dominance, decimals: 1, sign: "%", onClick: undefined },
      { label: "KRW/USD", value: usdExRate, decimals: 0, sign: null, onClick: onRoutePremiumPage },
      { label: "Premium", value: premium, decimals: 2, sign: "%", onClick: onRoutePremiumPage },
      { label: "F&G Index", value: feerGreed, decimals: 0, sign: null, onClick: onOpenFeerAndGreedModal }
    ]
  ), [dominance, usdExRate, premium, feerGreed]);

  // endregion


  return (
    <>
      <HorizontalCard className="macro-card" rows={1}>
        {
          macroDataList.map(({ label, value, sign, onClick, decimals }) => (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
            <div key={label} className="macro-card__item" onClick={onClick} tabIndex={0}>
              <span className="macro-card__item__text">{label}</span>
              <span className="macro-card__item__value">
                  {
                    typeof value === "number" ?
                      (<><CountText value={value} decimals={decimals} />{sign}</>) : value
                  }
                </span>
            </div>
          ))
        }
      </HorizontalCard>
      <FearAndGreedModal isOpen={IsFeerAndGreedModal} onClose={onCloseFeerAndGreedModal} />
    </>
  );
};

export default memo(PricePannel);
