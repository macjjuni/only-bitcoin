import PageLayout from "@/layout/pageLayout/pageLayout";
import BlockView from "@/components/dashboard/BlockView";
import MarketPrice from "@/components/dashboard/MarketPrice";
import BtcToKrw from "@/components/dashboard/BtcToKrw";
import { useBearStore } from "@/store";

const Btc2krw = () => {
  // Zustand Store
  const { btc, market, isKimchi, isLottiePlay, exRate, blockData } = useBearStore((state) => state);

  return (
    <PageLayout className="btc2krw-page">
      <BlockView blockData={blockData} />
      <MarketPrice btc={btc} market={market} isKimchi={isKimchi} isLottiePlay={isLottiePlay} exRate={exRate} />
      <BtcToKrw btc={btc} />
    </PageLayout>
  );
};

export default Btc2krw;
