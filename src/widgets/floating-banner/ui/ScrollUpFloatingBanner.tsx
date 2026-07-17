"use client";

import { ChevronUp } from "lucide-react";
import { FloatingBannerButton } from "@/shared/ui";

export default function ScrollUpFloatingBanner() {
  const handleClick = () => {
    const scrollContainer = document.querySelector(".only-btc__content");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <FloatingBannerButton onClick={handleClick} aria-label="Scroll to top">
      <ChevronUp size={28} className="text-black dark:text-white" />
    </FloatingBannerButton>
  );
}
