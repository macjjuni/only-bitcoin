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
      className="bg-neutral-900 border-emerald-500/40"
    >
      <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
    </FloatingBannerButton>
  );
}
