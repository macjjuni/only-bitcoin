"use client";

import { CircleArrowLeft } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { setTransitionDirection } from "@/shared/lib/transition";
import { FloatingBannerButton } from "@/shared/ui";

/** 히스토리가 없을 때 되돌아갈 상위 경로 */
const FALLBACK_PATH = "/blocks";

export default function CountdownBackFloatingBanner() {
  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

  // region [Privates]
  /**
   * 앱 안에서 이 페이지로 들어온 히스토리가 있는지 여부.
   * 공유 링크·PWA 시작·새로고침으로 바로 진입하면 `back()` 이 앱 밖으로 나가버린다.
   */
  const hasAppHistory = () => window.history.length > 1;
  // endregion

  // region [Events]
  const onClickBack = () => {
    // `TransitionLink` 가 진입 시 붙인 slide-left 가 남아 있어, 지정하지 않으면 뒤로가기도 전진 방향으로 재생된다.
    setTransitionDirection("right");

    if (hasAppHistory()) {
      router.back();
      return;
    }

    router.replace(FALLBACK_PATH);
  };
  // endregion

  return (
    <FloatingBannerButton
      onClick={onClickBack}
      aria-label="이전 페이지로 이동"
      className="-translate-y-8"
    >
      <CircleArrowLeft size={28} className="text-black dark:text-white" />
    </FloatingBannerButton>
  );
}
