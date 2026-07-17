"use client";

import { FloatingBannerButton } from "@/shared/ui";
import { MinerIcon } from "@/shared/ui/icon";

export default function Btc2FiatFloatingBanner() {
  return (
    <FloatingBannerButton href="/dca">
      <MinerIcon size={36} />
    </FloatingBannerButton>
  );
}
