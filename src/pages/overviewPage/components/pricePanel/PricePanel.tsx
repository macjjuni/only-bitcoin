import { memo, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { CountText, UpdownIcon } from "@/components";
import "./PricePanel.scss";


const PricePanel = () => {

  // region [Hooks]

  const bitcoinPrice = useStore(state => state.bitcoinPrice);
  const currency = useStore(state => state.setting.currency);

  // endregion


  // region [Templates]

  const Currencies = useMemo(() => [
    { code: 'KRW', sign: '₩', price: Number(bitcoinPrice.krw), percent: Number(bitcoinPrice.krwChange24h) },
    { code: 'USD', sign: '$', price: Number(bitcoinPrice.usd), percent: Number(bitcoinPrice.usdChange24h) },
  ],[bitcoinPrice]);

  // endregion


  return (
    <div className="price-panel">
      <div className="price-panel__price__area">
        {
          Currencies
          .filter(({ code }) => currency.includes(code))
          .map(({ code, sign, price, percent }) => (
            <div key={code} className={`price-panel__price__area__${code.toLowerCase()}`}>

              <div className={`price-panel__price__area__${code.toLowerCase()}__area`}>
                <span className={`price-panel__price__area__${code.toLowerCase()}__sign`}>
                  {sign}
                </span>
                <CountText value={price} />
              </div>

              <div className={`price-panel__price__area__${code.toLowerCase()}__percent`}>
                <UpdownIcon isUp={percent > 0} />
                <span className="percent__text">
                  {percent  > 0 && '+'}
                  <CountText value={percent} decimals={2} />%
                </span>
              </div>

            </div>
          ))
        }
      </div>
    </div>
  );
};

const MemoizedPricePanel =  memo(PricePanel);
MemoizedPricePanel.displayName = 'PricePanel'
PricePanel.displayName = 'PricePanel'

export default MemoizedPricePanel;
