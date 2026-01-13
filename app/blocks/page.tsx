import {
  BlocksExplorer,
  BlocksVisualizer,
  BlockTxFees,
  HalvingChartCard,
  HalvingDataCard,
} from "@/components/features/blocks";
import { PageLayout } from "@/layouts";


export default function BlocksPage() {

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
