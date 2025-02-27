import { memo, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { CountText, UpdownIcon } from "@/widgets";
import "./PricePannel.scss";


const PricePannel = () => {

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
    <div className="price-pannel">
      <h2 className="price-pannel__signature">₿itcoin</h2>

      <div className="price-pannel__price__area">
        {
          Currencies
          .filter(({ code }) => currency.includes(code))
          .map(({ code, sign, price, percent }) => (
            <div key={code} className={`price-pannel__price__area__${code.toLowerCase()}`}>

              <div className={`price-pannel__price__area__${code.toLowerCase()}__area`}>
                <span className={`price-pannel__price__area__${code.toLowerCase()}__sign`}>
                  {sign}
                </span>
                <CountText value={price} />
              </div>

              <div className={`price-pannel__price__area__${code.toLowerCase()}__percent`}>
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

export default memo(PricePannel);
