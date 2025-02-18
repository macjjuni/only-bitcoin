import { memo } from "react";
import useStore from "@/shared/stores/store";
import "./PricePannel.scss";
import { CountText } from "@/widgets";


const PricePannel = () => {

  // region [Hooks]

  const bitcoinPrice = useStore(state => state.bitcoinPrice);
  const currency = useStore(state => state.setting.currency);

  // endregion


  return (
    <div className="bitcoin-price-pannel">
      <h2 className="bitcoin-price-pannel__signature">₿itcoin</h2>

      <div className="bitcoin-price-pannel__price__area">
        {
          currency.includes("KRW") &&
          (
            <p className="bitcoin-price-pannel__price__area__krw">
              <span className="bitcoin-price-pannel__price__area__krw__sign">₩</span>
              <CountText value={bitcoinPrice.krw} />
            </p>
          )
        }
        {
          currency.includes("USD") &&
          <p className="bitcoin-price-pannel__price__area__usd">
            <span className="bitcoin-price-pannel__price__area__usd__sign">$</span>
            <CountText value={bitcoinPrice.usd} />
          </p>
        }
      </div>
    </div>
  );
};

export default memo(PricePannel);
