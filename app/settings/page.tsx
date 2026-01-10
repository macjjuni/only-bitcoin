'use client';

import dynamic from 'next/dynamic';
import useStore from "@/shared/stores/store";
import { PageLayout } from "@/layouts";
import {
  InfoListRowGroup,
  PriceListRowGroup,
  StyleListRowGroup
} from "@/app/settings/components";

const DynamicInstallListRowGroup = dynamic(
  () => import("@/app/settings/components").then((mod) => mod.InstallListRowGroup),
  { ssr: false }
);

export default function Page() {

  // region [Hooks]
  const deferredPrompt = useStore(state => state.setting.deferredPrompt);
  // endregion

  // region [Privates]
  const renderInstallGroup = () => {
    if (typeof window === 'undefined') return null;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSafari } = require("@/shared/utils/device");

    const canInstall = !isSafari() && deferredPrompt?.userChoice;

    return canInstall ? <DynamicInstallListRowGroup /> : null;
  };
  // endregion

  return (
    <PageLayout className="pt-0.5">
      {/* 가격 설정 그룹 */}
      <PriceListRowGroup />

      {/* 스타일 및 화면 설정 그룹 */}
      <StyleListRowGroup />

      {/* 설치 설정 (PWA) - SSR 배제 */}
      {renderInstallGroup()}

      {/* 정보 그룹 */}
      <InfoListRowGroup />
    </PageLayout>
  );
}