import { memo } from "react";
import { comma } from "@/shared/utils/string";
import "./PricePannel.scss";
import useStore from "@/shared/stores/store";


const PricePannel = () => {

  const bitcoinPrice = useStore(state => state.bitcoinPrice);

  return (
    <div className="bitcoin-price-pannel">
      <h2 className="bitcoin-price-pannel__signature">₿itcoin</h2>

      <div className="bitcoin-price-pannel__price__area">
        <p className="bitcoin-price-pannel__price__area__krw">
          <span className="bitcoin-price-pannel__price__area__krw__sign">₩</span>
          {comma(bitcoinPrice.krw)}
        </p>
        <p className="bitcoin-price-pannel__price__area__usd">
          <span className="bitcoin-price-pannel__price__area__usd__sign">$</span>
          {comma(bitcoinPrice.usd)}
        </p>
      </div>
    </div>
  );
};

export default memo(PricePannel);
