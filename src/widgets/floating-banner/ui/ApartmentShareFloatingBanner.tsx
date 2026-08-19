"use client";

import { Share2 } from "lucide-react";
import { useApartmentShareStore } from "@/features/btc2apartment-share";
import { FloatingBannerButton } from "@/shared/ui";

export default function ApartmentShareFloatingBanner() {
  const openModal = useApartmentShareStore((state) => state.openModal);

  return (
    <FloatingBannerButton
      onClick={openModal}
      aria-label="아파트 비트코인 환산 카드 보기"
      className="bg-neutral-900 border-bitcoin/50"
    >
      <Share2 size={22} className="group-hover:rotate-12 transition-transform" />
    </FloatingBannerButton>
  );
}
