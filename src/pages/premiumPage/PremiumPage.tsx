import { useMemo } from "react";
import { useOutletContext } from "react-router";
import { usePageAnimation, type UsePageAnimation } from "@/shared/hooks";
import { PremiumPanel } from "@/pages/premiumPage/components";
import { PageLayout } from "@/layouts";
import { Lottie } from "@/components";
import premiumData from "@/shared/assets/lottie/premium.json";


const LottieData = {
  animationData: premiumData,
  width: "520px",
  height: "520px",
};

export default function PremiumPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const PremiumLottie = useMemo(() => (<Lottie {...LottieData} />), []);
  // endregion

  return (
    <PageLayout className="gap-3 overflow-hidden [perspective:1000px]">
      <div className="absolute top-[-88px] right-[-160px] opacity-100 -z-[1] animate-swing">
        {PremiumLottie}
      </div>
      <PremiumPanel />
    </PageLayout>
  );
}
