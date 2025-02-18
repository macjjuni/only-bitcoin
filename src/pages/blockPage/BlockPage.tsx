import { BlockExplorer, BlockVisualizer } from "@/widgets";
import "./BlockPage.scss";

export default function BlockPage() {


  // region [Templates]
  // endregion

  return (
    <section className="block-page__area">
      <BlockVisualizer />
      <BlockExplorer />
    </section>
  );
}
