import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";
import { calcPremiumPercent } from "@/shared/utils/common";
import { comma } from "@/shared/utils/string";
import useStore from "@/shared/stores/store";
import { FeerAndGreedModal } from "@/widgets/modal";
import "./MacroCard.scss";


const PricePannel = () => {

  // region [Hooks]

  const { krw, usd } = useStore(state => state.bitcoinPrice);
  const dominance = useStore(state => state.dominance.value);
  const usdExRate = useStore(state => state.exRate.value);
  const feerGreed = useStore(state => state.fearGreed.value);
  const premium = useMemo(() => (calcPremiumPercent(krw, usd, usdExRate)), [krw, usd, usdExRate]);

  const navigate = useNavigate();
  const [IsFeerAndGreedModal, setIsFeerAndGreedModal] = useState(false);

  // endregion


  // region [Privates]

  const onRoutePremiumPage = useCallback(() => {
    navigate('/premium');
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
      { label: "BTC.D", value: dominance, sign: "%", onClick: undefined },
      { label: "KRW/USD", value: comma(usdExRate), sign: null, onClick: onRoutePremiumPage },
      { label: "Premium", value: premium, sign: "%", onClick: onRoutePremiumPage },
      { label: "F&G Index", value: feerGreed, sign: null, onClick: onOpenFeerAndGreedModal }
    ]
  ), [dominance, usdExRate, premium, feerGreed]);

  // endregion


  return (
    <>
      <HorizontalCard className="macro-card" rows={1}>
        {
          macroDataList.map(({ label, value, sign, onClick }) => (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
            <div key={label} className="macro-card__item" onClick={onClick} tabIndex={0}>
              <span className="macro-card__item__text">{label}</span>
              <span className="macro-card__item__value">{value}{sign}</span>
            </div>
          ))
        }
      </HorizontalCard>
      <FeerAndGreedModal isOpen={IsFeerAndGreedModal} onClose={onCloseFeerAndGreedModal} />
    </>
  );
};

export default memo(PricePannel);
