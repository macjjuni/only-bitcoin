import { memo, useCallback, useMemo } from "react";
import { useBearStore } from "@/store";
import BlockView from "@/pages/dashboard/components/blockView/blockView";
import PremiumRate from "@/pages/dashboard/components/premiumRate/premiumRate";
import CountText from "@/components/atom/CountText/CountText";
import NetworkStatusButton from "@/pages/dashboard/components/NetworkStatusButton/NetworkStatusButton";
import Dot from "@/components/atom/Dot/Dot";
import initUpbit from "@/socket/upbit";
import initBinance from "@/socket/binance";
import "./marketData.scss";

function MarketData() {
  // region [Hooks]

  const btc = useBearStore((state) => state.btc);
  const market = useBearStore((state) => state.market);
  const blockData = useBearStore((state) => state.blockData);

  // endregion

  // region [Privates]

  const onConnectUpbit = useCallback(() => {
    initUpbit();
  }, []);

  const onConnectBinance = useCallback(() => {
    initBinance();
  }, []);

  const countTextKrw = useMemo(() => {
    return <CountText className="only-btc__market-price__cost__text--center" text={btc.krw} duration={0.2} isAnime
                      leftText="₩" />;
  }, [btc.krw]);

  const countTextUsd = useMemo(() => {
    return <CountText className="only-btc__market-price__cost__text--center" text={btc.usd} duration={0.2} isAnime
                      leftText="$" />;
  }, [btc.usd]);

  // endregion

  return (
    <div className="only-btc__market-price">
      <h1 className="only-btc__market-price__signature__text">Bitcoin</h1>
      {market.includes("KRW") && (
        <h2 className="only-btc__market-price__cost__text">
          {countTextKrw}
          <Dot status={btc.isKrwStatus} />
          {!btc.isKrwStatus && (<NetworkStatusButton onClick={onConnectUpbit} />)}
        </h2>
      )}
      {market.includes("USD") && (
        <h2 className="only-btc__market-price__cost__text">
          {countTextUsd}
          <Dot status={btc.isKrwStatus} />
          {!btc.isUsdStatus && (<NetworkStatusButton onClick={onConnectBinance} />)}
        </h2>
      )}

      <div className="only-btc__market-price__bottom-area">
        <BlockView blockData={blockData} />
        <PremiumRate btc={btc} />
      </div>
    </div>
  );
}

export default memo(MarketData);
