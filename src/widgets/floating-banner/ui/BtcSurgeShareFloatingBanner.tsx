"use client";

import { TrendingUp } from "lucide-react";
import { useBtcSurgeShareStore } from "@/features/btc-surge-share";
import useSettingStore from "@/shared/stores/settingStore";
import { FloatingBannerButton } from "@/shared/ui";

export default function BtcSurgeShareFloatingBanner() {
  const openModal = useBtcSurgeShareStore((state) => state.openModal);
  const isLab = useSettingStore((state) => state.setting.isLab);

  if (!isLab) {
    return null;
  }

  return (
    <FloatingBannerButton
      onClick={openModal}
      aria-label="시세 알림 카드 보기"
      className="bg-neutral-900 border-emerald-500/40 text-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.3)] hover:scale-110 active:scale-95 group transition-all"
    >
      <TrendingUp size={24} className="group-hover:rotate-12 transition-transform" />
    </FloatingBannerButton>
  );
}
