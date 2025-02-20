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
    bitcoinPrice.usdChange24h.includes('-') ? 'triangleDown' : 'triangleUp'
  ), [bitcoinPrice.krwChange24h])


  const usdChangeIconName = useMemo(() => (
    bitcoinPrice.usdChange24h.includes('-') ? 'triangleDown' : 'triangleUp'
  ), [bitcoinPrice.usdChange24h])

  // endregion


  return (
    <div className="price-pannel">
      <h2 className="price-pannel__signature">₿itcoin</h2>

      <div className="price-pannel__price__area">
        {
          currency.includes("KRW") &&
          (
            <div className="price-pannel__price__area__krw">
              <div className="price-pannel__price__area__krw__area">
                <span className="price-pannel__price__area__krw__sign">₩</span>
                <CountText value={bitcoinPrice.krw} />
              </div>
              <div className="price-pannel__price__area__krw__percent">
                <KIcon icon={krwChangeIconName} color="#fff" size={8} />
                {bitcoinPrice.krwChange24h}%
              </div>
            </div>
          )
        }
        {
          currency.includes("USD") &&
          <div className="price-pannel__price__area__usd">
            <div className="price-pannel__price__area__usd__area">
              <span className="price-pannel__price__area__usd__sign">$</span>
              <CountText value={bitcoinPrice.usd} />
            </div>
            <div className="price-pannel__price__area__usd__percent">
              <KIcon icon={usdChangeIconName} color="#fff" size={8}/>
              {bitcoinPrice.usdChange24h}%
            </div>
          </div>
        }
      </div>
    </div>
  );
};

export default memo(PricePannel);
