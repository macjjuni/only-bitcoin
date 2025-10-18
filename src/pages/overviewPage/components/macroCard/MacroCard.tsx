import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calcPremiumPercent } from "@/shared/utils/common";
import useStore from "@/shared/stores/store";
import { FearAndGreedModal } from "@/components/modal";
import { CountText, HorizontalCard } from "../../../../components";
import { useBitcoinDominanceQuery, useFearGreedIndex } from "@/shared/api";
import "./MacroCard.scss";


const PricePannel = () => {

  // region [Hooks]

  const { dominance } = useBitcoinDominanceQuery();
  const { fearGreed } = useFearGreedIndex();

  const { krw, usd } = useStore(state => state.bitcoinPrice);
  const usdExRate = useStore(state => state.exRate.value);

  const premium = useMemo(() => {
    if (usdExRate !== 0) {
      return calcPremiumPercent(krw, usd, usdExRate);
    }
    return 'Error';
  }, [krw, usd, usdExRate]);

  const navigate = useNavigate();
  const [IsFearAndGreedModal, setIsFearAndGreedModal] = useState(false);

  // endregion


  // region [Privates]

  const onRoutePremiumPage = useCallback(() => {
    navigate("/premium");
  }, []);

  // endregion


  // region [Events]

  const onCloseFearAndGreedModal = useCallback(() => {
    setIsFearAndGreedModal(false);
  }, []);

  const onOpenFearAndGreedModal = useCallback(() => {
    setIsFearAndGreedModal(true);
  }, []);

  // endregion


  // region [Templates]

  const macroDataList = useMemo(() => (
    [
      { label: "BTC.D", value: dominance, decimals: 1, sign: "%", onClick: undefined },
      { label: "KRW/USD", value: usdExRate, decimals: 0, sign: null, onClick: onRoutePremiumPage },
      { label: "Premium", value: premium, decimals: 2, sign: "%", onClick: onRoutePremiumPage },
      { label: "F&G Index", value: fearGreed, decimals: 0, sign: null, onClick: onOpenFearAndGreedModal }
    ]
  ), [dominance, usdExRate, premium, fearGreed]);

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
                {typeof value === "number" && (<><CountText value={value} decimals={decimals} />{sign}</>)}
                {typeof value === "string" && value}
                </span>
            </div>
          ))
        }
      </HorizontalCard>
      <FearAndGreedModal isOpen={IsFearAndGreedModal} onClose={onCloseFearAndGreedModal} />
    </>
  );
};

export default memo(PricePannel);
