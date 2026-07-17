"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Btc2FiatFloatingBanner from "./ui/Btc2FiatFloatingBanner";
import DcaAddRecordFloatingBanner from "./ui/DcaAddRecordFloatingBanner";
import ScrollUpFloatingBanner from "./ui/ScrollUpFloatingBanner";

interface BannerConfig {
  id: string;
  Component: React.ComponentType;
  useIsVisible: () => boolean;
}

function useScrollVisibility(threshold = 100) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector(".only-btc__content");
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsVisible(scrollContainer.scrollTop > threshold);
    };

    handleScroll();

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [threshold, pathname]);

  return isVisible;
}

const BANNER_CONFIGS: BannerConfig[] = [
  {
    id: "btc2fiat",
    Component: Btc2FiatFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname.startsWith("/btc2fiat");
    },
  },
  {
    id: "dca-add-record",
    Component: DcaAddRecordFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname.startsWith("/dca");
    },
  },
  {
    id: "scroll-up",
    Component: ScrollUpFloatingBanner,
    useIsVisible: () => useScrollVisibility(100),
  },
];

function BannerItem({ config }: { config: BannerConfig }) {
  const isVisible = config.useIsVisible();

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-auto">
      <config.Component />
    </div>
  );
}

export default function GlobalFloatingBanner() {
  return (
    <div
      className={[
        "fixed bottom-bottom-nav right-0 z-[10] pr-4 pb-3.5 pointer-events-none",
        "flex flex-col gap-2 items-end",
        "layout-max:left-1/2 layout-max:max-w-[calc(theme(maxWidth.layout)-2px)] layout-max:-translate-x-1/2",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {BANNER_CONFIGS.map((config) => (
        <BannerItem key={config.id} config={config} />
      ))}
    </div>
  );
}
