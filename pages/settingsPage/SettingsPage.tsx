import { useOutletContext } from "react-router";
import useStore from "@/shared/stores/store";
import { PageLayout } from "@/layouts";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import {
  InfoListRowGroup,
  InstallListRowGroup,
  PriceListRowGroup,
  StyleListRowGroup
} from "@/pages/settingsPage/components";
import { isSafari } from "@/shared/utils/device";


export default function SettingsPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const deferredPrompt = useStore(state => state.setting.deferredPrompt);
  // endregion

  return (
    <PageLayout className="pt-0.5">
      <PriceListRowGroup /> {/* 가격 설정 그룹 */}
      <StyleListRowGroup /> {/* 스타일 및 화면 설정 그룹 */}
      {!isSafari() && deferredPrompt?.userChoice && (<InstallListRowGroup />)} {/* 설치 설정 (PWA) */}
      <InfoListRowGroup /> {/* 정보 */}
    </PageLayout>
  );
}
