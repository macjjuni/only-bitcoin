"use client";

import { ArrowLeft } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { setTransitionDirection } from "@/shared/lib/transition";
import { FloatingBannerButton } from "@/shared/ui";

const FALLBACK_PATH = "/blocks";

export default function CountdownBackFloatingBanner() {
  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

  // region [Privates]
  const hasAppHistory = () => window.history.length > 1;
  // endregion

  // region [Events]
  const onClickBack = () => {
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
      className="-translate-y-6"
    >
      <ArrowLeft size={28} className="text-black dark:text-white" />
    </FloatingBannerButton>
  );
}
