import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { BlocksExplorer, BlocksVisualizer, HalvingChartCard, HalvingDataCard, TxFeeCard } from "@/widgets/pages/blocks";
import { NotKeyNotYourBitcoin } from "@/widgets";
import "./BlocksPage.scss";


export default function BlocksPage() {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());

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
