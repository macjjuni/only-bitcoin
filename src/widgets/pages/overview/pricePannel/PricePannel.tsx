import { memo, useMemo } from "react";
import { KIcon } from "kku-ui";
import useStore from "@/shared/stores/store";
import { CountText } from "@/widgets";
import "./PricePannel.scss";


const PricePannel = () => {

  // region [Hooks]

  const bitcoinPrice = useStore(state => state.bitcoinPrice);
  const currency = useStore(state => state.setting.currency);

  const krwChangeIconName = useMemo(() => (
    bitcoinPrice.usdChange24h.includes('-') ? {name: 'triangleDown', class: 'down' } : {name:'triangleUp', class:'up'}
  ), [bitcoinPrice.krwChange24h])


  const usdChangeIconName = useMemo(() => (
    bitcoinPrice.usdChange24h.includes('-') ? {name: 'triangleDown', class: 'down' } : {name:'triangleUp', class:'up'}
  ), [bitcoinPrice.usdChange24h])

  // endregion


  // region [Templates]

  const Currencies = useMemo(() => [
    { code: 'KRW', sign: '₩', price: bitcoinPrice.krw, change: bitcoinPrice.krwChange24h, icon: krwChangeIconName },
    { code: 'USD', sign: '$', price: bitcoinPrice.usd, change: bitcoinPrice.usdChange24h, icon: usdChangeIconName },
  ],[bitcoinPrice, krwChangeIconName, usdChangeIconName]);

  // endregion


  return (
    <div className="price-pannel">
      <h2 className="price-pannel__signature">₿itcoin</h2>

      <div className="price-pannel__price__area">
        {
          Currencies
          .filter(({ code }) => currency.includes(code))
          .map(({ code, sign, price, change, icon }) => (
            <div key={code} className={`price-pannel__price__area__${code.toLowerCase()}`}>

              <div className={`price-pannel__price__area__${code.toLowerCase()}__area`}>

                <span className={`price-pannel__price__area__${code.toLowerCase()}__sign`}>
                  {sign}
                </span>
                <CountText value={price} />

              </div>

              <div className={`price-pannel__price__area__${code.toLowerCase()}__percent`}>
                <KIcon icon={icon.name} className={icon.class} color="currentColor" size={8} />
                <span className="percent__text">{change}%</span>
              </div>

            </div>
          ))
        }
      </div>
    </div>
  );
};

export default memo(PricePannel);
