"use client";

import { Share2 } from "lucide-react";
import { useBtcSurgeShareStore } from "@/features/btc-surge-share";
import { FloatingBannerButton } from "@/shared/ui";

export default function BtcSurgeShareFloatingBanner() {
  const openModal = useBtcSurgeShareStore((state) => state.openModal);

  return (
    <div className="relative">
      {/* 비트코인 컬러 글로우 펄스 (iOS WebKit filter:blur 레이어 이슈 방지를 위해 box-shadow 사용) */}
      <span
        className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(247,147,26,0.6)] pointer-events-none animate-glow-pulse"
      />

      <FloatingBannerButton
        onClick={openModal}
        aria-label="비트코인 개요 카드 보기"
        className="relative bg-neutral-900 border-bitcoin/40 shadow-[0_0_12px_rgba(247,147,26,0.3)]"
      >
        <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
      </FloatingBannerButton>
    </div>
  );
}
