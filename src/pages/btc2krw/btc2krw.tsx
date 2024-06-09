import PageLayout from "@/layout/pageLayout/pageLayout";
import BtcToKrw from "@/pages/btc2krw/components/BtcToKrw";
import MarketPrice from "@/pages/btc2krw/components/MarketPrice/marketPrice";
import { useBearStore } from "@/store";

const Btc2krw = () => {
  const { btc, market, isLottiePlay } = useBearStore((state) => state);

  return (
    <PageLayout className="btc2krw-page">
      <MarketPrice btc={btc} market={market} isLottiePlay={isLottiePlay} />
      <BtcToKrw btc={btc} />
    </PageLayout>
  );
};

export default Btc2krw;
