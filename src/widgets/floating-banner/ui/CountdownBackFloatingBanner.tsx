"use client";

import { CircleArrowLeft } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { FloatingBannerButton } from "@/shared/ui";

export default function CountdownBackFloatingBanner() {
  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

  // region [Events]
  const onClickBack = () => {
    router.back();
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
