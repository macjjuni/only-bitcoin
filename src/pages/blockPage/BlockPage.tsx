import { BlockExplorer, BlockVisualizer } from "@/widgets";
import "./BlockPage.scss";
import TxFeeCard from "@/widgets/pages/block/txFeeCard/TxFeeCard";

export default function BlockPage() {


  // region [Templates]
  // endregion

  return (
    <section className="block-page__area">
      <BlockVisualizer />
      <BlockExplorer />
      <TxFeeCard />
    </section>
  );
}
