import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import {
  BlocksExplorer,
  BlocksVisualizer,
  BlockTxFees,
  HalvingChartCard,
  HalvingDataCard,
} from "@/pages/blocksPage/components";
import { PageLayout } from "@/layouts";


export default function BlocksPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  // endregion

  return (
    <PageLayout className="block-page__area">
      <BlocksVisualizer />
      <BlockTxFees />
      <BlocksExplorer />
      <HalvingChartCard />
      <HalvingDataCard />
    </PageLayout>
  );
}
