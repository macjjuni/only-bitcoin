'use client';

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  InfoListRowGroup,
  PriceListRowGroup,
  StyleListRowGroup
} from "@/components/features/settings";
import useStore from "@/shared/stores/store";
import { isSafari } from "@/shared/utils/device";


const DynamicInstallListRowGroup = dynamic(
  () => import("@/components/features/settings").then((mod) => mod.InstallListRowGroup),
  { ssr: false }
);


const SettingsPage = () => {
  // region [Hooks]
  const deferredPrompt = useStore(state => state.setting.deferredPrompt);

  const showInstallGroup = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !isSafari() && !!deferredPrompt;
  }, [deferredPrompt]);
  // endregion

  return (
    <>
      {/* 가격 설정 그룹 */}
      <PriceListRowGroup />

      {/* 스타일 및 화면 설정 그룹 */}
      <StyleListRowGroup />

      {/* 설치 설정 (PWA) - dynamic으로 선언했으므로 조건만 맞으면 클라이언트에서 렌더링 */}
      {showInstallGroup && <DynamicInstallListRowGroup />}

      {/* 정보 그룹 */}
      <InfoListRowGroup />
    </>
  );
};

const MemoizedSettingsPage = memo(SettingsPage);
MemoizedSettingsPage.displayName = "SettingsPage";

export default MemoizedSettingsPage;