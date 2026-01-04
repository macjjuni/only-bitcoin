'use client';

import useStore from "@/shared/stores/store";
import { PageLayout } from "@/layouts";
import {
  InfoListRowGroup,
  InstallListRowGroup,
  PriceListRowGroup,
  StyleListRowGroup
} from "@/app/settings/components";
import { isSafari } from "@/shared/utils/device";
import { useMounted } from '@/shared/hooks'


export default function Page() {

  // region [Hooks]
  const deferredPrompt = useStore(state => state.setting.deferredPrompt);
  const isMount = useMounted();
  // endregion

  return (
    <PageLayout className="pt-0.5">
      <PriceListRowGroup /> {/* 가격 설정 그룹 */}
      <StyleListRowGroup /> {/* 스타일 및 화면 설정 그룹 */}
      {/* 설치 설정 (PWA) */}
      {
        isMount && (
          !isSafari() && deferredPrompt?.userChoice && (<InstallListRowGroup />)
        )
      }
      <InfoListRowGroup /> {/* 정보 */}
    </PageLayout>
  );
}
