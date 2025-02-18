import { memo, useMemo } from "react";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";
import { calcPremiumPercent } from "@/shared/utils/common";
import { comma } from "@/shared/utils/string";
import useStore from "@/shared/stores/store";
import "./MacroCard.scss";


const PricePannel = () => {

  // region [Hooks]

  const { krw, usd } = useStore(state => state.bitcoinPrice);
  const dominance = useStore(state => state.dominance.value);
  const usdExRate = useStore(state => state.exRate.value);
  const feerGreed = useStore(state => state.fearGreed.value);
  const premium = useMemo(() => (calcPremiumPercent(krw, usd, usdExRate)), [krw, usd, usdExRate]);

  const macroDataList = useMemo(() => (
    [
      { label: "BTC.D", value: dominance, sign: '%' },
      { label: "KRW/USD", value: comma(usdExRate), sign: null },
      { label: "Premium", value: premium, sign: '%' },
      { label: "F&G Index", value: feerGreed, sign: null }
    ]
  ), [dominance, usdExRate, premium, feerGreed]);

  // endregion


  return (
    <HorizontalCard className="macro-card" rows={1}>
      {
        macroDataList.map(({label, value, sign}) => (
          <div key={label} className="macro-card__item">
            <span className="macro-card__item__text">{label}</span>
            <span className="macro-card__item__value">{value}{sign}</span>
          </div>
        ))
      }
    </HorizontalCard>
  );
};

export default memo(PricePannel);
