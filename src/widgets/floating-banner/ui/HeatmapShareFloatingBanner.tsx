"use client";

import { Share2 } from "lucide-react";
import { useHeatmapShareStore } from "@/features/heatmap-share";
import { FloatingBannerButton } from "@/shared/ui";

export default function HeatmapShareFloatingBanner() {
  const openModal = useHeatmapShareStore((state) => state.openModal);

  return (
    <FloatingBannerButton
      onClick={openModal}
      aria-label="시가총액 히트맵 카드 보기"
      className="bg-neutral-900 border-bitcoin/50"
    >
      <Share2 size={22} className="group-hover:rotate-12 transition-transform" />
    </FloatingBannerButton>
  );
}
