import { useOutletContext, useNavigate } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import "./bip39Page.scss";



export default function PremiumPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const navigate = useNavigate();
  // endregion


  // region [Privates]

  // endregion

  return (
    <PageLayout className="bip39__page__area">
      <div>
        BIP-39
      </div>
    </PageLayout>
  );
}
