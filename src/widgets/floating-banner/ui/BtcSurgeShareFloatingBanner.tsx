"use client";

import { Share2 } from "lucide-react";
import { useBtcSurgeShareStore } from "@/features/btc-surge-share";
import { FloatingBannerButton } from "@/shared/ui";

export default function BtcSurgeShareFloatingBanner() {
  const openModal = useBtcSurgeShareStore((state) => state.openModal);

  return (
    <FloatingBannerButton
      onClick={openModal}
      aria-label="비트코인 개요 카드 보기"
      className="relative bg-neutral-900 border-bitcoin/40 shadow-[0_0_12px_rgba(247,147,26,0.3)]"
    >
      <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
    </FloatingBannerButton>
  );
}
