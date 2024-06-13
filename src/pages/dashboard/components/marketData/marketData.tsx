import { memo, useMemo } from "react";
import { useBearStore } from "@/store";
import BlockView from "@/pages/dashboard/components/blockView/blockView";
import PremiumRate from "@/pages/dashboard/components/premiumRate/premiumRate";
import "./marketData.scss";
import CountText from "@/components/atom/countText/countText";

function MarketData() {
  // region [Hooks]

  const btc = useBearStore((state) => state.btc);
  const market = useBearStore((state) => state.market);
  const blockData = useBearStore((state) => state.blockData);

  // endregion

  // region [Privates]

  const countTextKrw = useMemo(() => {
    return <CountText text={btc.krw} duration={0.2} isAnime />;
  }, [btc.krw]);

  const countTextUsd = useMemo(() => {
    return <CountText text={btc.usd} duration={0.2} isAnime />;
  }, [btc.usd]);

  // endregion

  return (
    <div className="only-btc__market-price">
      <h1 className="only-btc__market-price__signature__text">Bitcoin</h1>
      {market.includes("KRW") && <h2 className="only-btc__market-price__cost__text">₩{countTextKrw}</h2>}
      {market.includes("USD") && <h2 className="only-btc__market-price__cost__text">${countTextUsd}</h2>}

      <div className="only-btc__market-price__bottom-area">
        <BlockView blockData={blockData} />
        <PremiumRate btc={btc} />
      </div>
    </div>
  );
}

export default memo(MarketData);
