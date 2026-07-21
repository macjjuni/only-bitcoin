"use client";

import { Hourglass } from "lucide-react";
import { FloatingBannerButton } from "@/shared/ui";

export default function BlocksCountdownFloatingBanner() {
  return (
    <FloatingBannerButton href="/blocks/countdown" aria-label="카운트다운 페이지 이동">
      <Hourglass size={28} className="text-black dark:text-white" />
    </FloatingBannerButton>
  );
}
