import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import { BlocksExplorer, BlocksVisualizer, HalvingChartCard, HalvingDataCard, TxFeeCard } from "@/pages/blocksPage/components";


export default function BlocksPage() {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  return (
    <PageLayout className="block-page__area">
      <BlocksVisualizer />
      <BlocksExplorer />
      <TxFeeCard />
      <HalvingChartCard />
      <HalvingDataCard />
    </PageLayout>
  );
}
