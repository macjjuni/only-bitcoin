"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hideBottomNavPathList } from "@/shared/config/route";
import BlocksCountdownFloatingBanner from "./ui/BlocksCountdownFloatingBanner";
import Btc2FiatFloatingBanner from "./ui/Btc2FiatFloatingBanner";
import CountdownBackFloatingBanner from "./ui/CountdownBackFloatingBanner";
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
    id: "blocks-countdown",
    Component: BlocksCountdownFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname === "/blocks";
    },
  },
  {
    id: "countdown-back",
    Component: CountdownBackFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname === "/blocks/countdown";
    },
  },
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
  const pathname = usePathname();

  // 하단 네비가 없는 페이지는 그 높이만큼 띄울 이유가 없으므로 바닥에 붙인다.
  const hasBottomNav = !hideBottomNavPathList.includes(pathname);

  return (
    <div
      className={[
        // 헤더·바텀 네비와 동일하게 페이지 전환 시 함께 밀리지 않는 고정 UI 로 취급한다.
        "only-btc__floating-banner",
        "fixed right-0 z-[10] pr-4 pb-3.5 pointer-events-none",
        hasBottomNav ? "bottom-bottom-nav" : "bottom-0",
        "flex flex-col gap-2 items-end",
        "layout-max:left-1/2 layout-max:w-full layout-max:max-w-[calc(theme(maxWidth.layout)-2px)] layout-max:-translate-x-1/2",
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
