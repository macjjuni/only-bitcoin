"use client";

import { Share2 } from "lucide-react";
import { memo } from "react";
import { FloatingBannerButton } from "@/shared/ui";
import { usePremiumShareStore } from "../model/usePremiumShareStore";

function PremiumShareFloatingBanner() {
  const openModal = usePremiumShareStore((state) => state.openModal);

  return (
    <FloatingBannerButton onClick={openModal} aria-label="프리미엄 이미지 공유하기">
      <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
    </FloatingBannerButton>
  );
}

export default memo(PremiumShareFloatingBanner);
