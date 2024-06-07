import PageLayout from "@/layout/pageLayout/pageLayout";
import BlockView from "@/components/dashboard/BlockView";
import MarketPrice from "@/components/dashboard/MarketPrice/marketPrice";
import BtcToKrw from "@/components/dashboard/BtcToKrw";
import { useBearStore } from "@/store";

const Btc2krw = () => {
  const { btc, market, isLottiePlay, exRate, blockData } = useBearStore((state) => state);

  return (
    <PageLayout className="btc2krw-page">
      {/* <BlockView blockData={blockData} /> */}
      <MarketPrice btc={btc} market={market} isLottiePlay={isLottiePlay} exRate={exRate} />
      <BtcToKrw btc={btc} />
    </PageLayout>
  );
};

export default Btc2krw;
