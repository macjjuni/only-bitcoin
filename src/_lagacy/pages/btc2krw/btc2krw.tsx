import PageLayout from "@/layouts/pageLayout/pageLayout";
import BtcToKrw from "@/pages/btc2krw/components/BtcToKrw";
// import MarketPrice from "@/pages/btc2krw/components/MarketPrice/marketPrice";
import { useBearStore } from "@/store";
import NotKeyNotBtc from "@/components/atom/NotKeyNotBtc/NotKeyNotBtc";

const Btc2krw = () => {
  const btc = useBearStore((state) => state.btc);

  return (
    <PageLayout className="btc2krw-page">
      {/* <MarketPrice btc={btc} market={market} isLottiePlay={isLottiePlay} /> */}
      <NotKeyNotBtc fontSize="20px" style={{ marginBottom: "16px" }} />
      <BtcToKrw btc={btc} />
    </PageLayout>
  );
};

export default Btc2krw;
