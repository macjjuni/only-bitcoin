import { BlocksVisualizer, BlocksExplorer, TxFeeCard, HalvingChartCard, HalvingDataCard } from "@/widgets/pages/blocks";
import { NotKeyNotYourBitcoin } from "@/widgets";
import "./BlocksPage.scss";


export default function BlocksPage() {

  // region [Templates]
  // endregion

  return (
    <section className="block-page__area">
      <BlocksVisualizer />
      <BlocksExplorer />
      <TxFeeCard />
      <HalvingChartCard />
      <HalvingDataCard />
      <NotKeyNotYourBitcoin />
    </section>
  );
}
