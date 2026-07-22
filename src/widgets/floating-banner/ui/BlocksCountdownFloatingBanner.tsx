"use client";

import { FloatingBannerButton, HalfCircleIcon } from "@/shared/ui";

export default function BlocksCountdownFloatingBanner() {
  return (
    <FloatingBannerButton href="/blocks/countdown" aria-label="카운트다운 페이지 이동">
      <HalfCircleIcon size={28} />
    </FloatingBannerButton>
  );
}
