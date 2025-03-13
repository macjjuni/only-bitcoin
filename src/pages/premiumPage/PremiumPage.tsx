import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { NotKeyNotYourBitcoin } from "@/widgets";
import { PremiumPannel } from "@/widgets/pages/premium";
import "./PremiumPage.scss";


export default function PremiumPage() {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  return (
    <div className="premium-page__area">
      <PremiumPannel />
      <NotKeyNotYourBitcoin />
    </div>
  );
}
