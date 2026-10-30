"use client";

import { usePathname } from "next/navigation";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { BtcSurgeShareDialog } from "@/features/btc-surge-share";
import { NewsFloatingBanner } from "@/features/news-feed";
import { PremiumShareDialog, PremiumShareFloatingBanner } from "@/features/premium-share";
import { hideBottomNavPathList } from "@/shared/config/route";
import ApartmentShareFloatingBanner from "./ui/ApartmentShareFloatingBanner";
import BlocksCountdownFloatingBanner from "./ui/BlocksCountdownFloatingBanner";
import BtcSurgeShareFloatingBanner from "./ui/BtcSurgeShareFloatingBanner";
import CountdownBackFloatingBanner from "./ui/CountdownBackFloatingBanner";
import DcaAddRecordFloatingBanner from "./ui/DcaAddRecordFloatingBanner";
import OrangeBackFloatingBanner from "./ui/OrangeBackFloatingBanner";
import ScrollUpFloatingBanner from "./ui/ScrollUpFloatingBanner";

interface BannerConfig {
  id: string;
  /** 안 적으면 오른쪽. 왼쪽은 소식지처럼 글이 들어가는 배너용. */
  side?: "left" | "right";
  Component: ComponentType;
  useIsVisible: () => boolean;
}

interface GlobalFloatingBannerProps {
  children: ReactNode;
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

const isOverviewPath = (pathname: string) => pathname === "/" || pathname === "/overview";

const BANNER_CONFIGS: BannerConfig[] = [
  {
    id: "news",
    side: "left",
    Component: NewsFloatingBanner,
    useIsVisible: () => isOverviewPath(usePathname()),
  },
  // 뒤로가기는 맨 위, 페이지 기능은 엄지 닿는 아래쪽, 위로가기는 맨 아래 순으로 둠.
  {
    id: "orange-back",
    Component: OrangeBackFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      const orangeSubPaths = [
        "/m2btc",
        "/etf",
        "/treasury",
        "/cagr",
        "/meme",
        "/btc2apartment",
        "/incidents",
        "/withdraw-fee",
        "/war",
        "/dca",
        "/bip39",
      ];
      return orangeSubPaths.some((sub) => pathname.startsWith(sub));
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
    id: "btc-surge-share",
    Component: BtcSurgeShareFloatingBanner,
    useIsVisible: () => {
      return isOverviewPath(usePathname());
    },
  },
  {
    id: "premium-share",
    Component: PremiumShareFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname.startsWith("/premium");
    },
  },
  {
    id: "btc2apartment-share",
    Component: ApartmentShareFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname.startsWith("/btc2apartment");
    },
  },
  {
    id: "blocks-countdown",
    Component: BlocksCountdownFloatingBanner,
    useIsVisible: () => {
      const pathname = usePathname();
      return pathname === "/blocks";
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
    useIsVisible: () => useScrollVisibility(800),
  },
];

function BannerItem({ config }: { config: BannerConfig }) {
  const isVisible = config.useIsVisible();

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-auto max-w-full">
      <config.Component />
    </div>
  );
}

const leftBannerConfigs = BANNER_CONFIGS.filter((config) => config.side === "left");
const rightBannerConfigs = BANNER_CONFIGS.filter((config) => config.side !== "left");

export default function GlobalFloatingBanner({ children }: GlobalFloatingBannerProps) {
  const pathname = usePathname();

  // 하단 네비가 없는 페이지는 그 높이만큼 띄울 이유가 없으므로 바닥에 붙임.
  const hasBottomNav = !hideBottomNavPathList.includes(pathname);

  const bottomClassName = hasBottomNav ? "bottom-bottom-nav" : "bottom-0";
  // 헤더·바텀 네비와 동일하게 페이지 전환 시 함께 밀리지 않는 고정 UI 로 취급.
  const layoutMaxClassName =
    "layout-max:left-1/2 layout-max:w-full layout-max:max-w-[calc(theme(maxWidth.layout)-2px)] layout-max:-translate-x-1/2";

  return (
    <>
      {/* 오른쪽 버튼 열(52px + 여백)만큼 비워서 글 배너가 버튼을 덮지 않게 했음. */}
      <div
        className={[
          "only-btc__floating-banner-left",
          "fixed left-0 right-0 z-[10] pl-4 pr-[84px] pb-3.5 pointer-events-none",
          bottomClassName,
          "flex flex-col gap-2 items-start",
          layoutMaxClassName,
        ].join(" ")}
      >
        {leftBannerConfigs.map((config) => (
          <BannerItem key={config.id} config={config} />
        ))}
      </div>
      <div
        className={[
          "only-btc__floating-banner",
          "fixed right-0 z-[10] pr-4 pb-3.5 pointer-events-none",
          bottomClassName,
          "flex flex-col gap-2 items-end",
          layoutMaxClassName,
        ].join(" ")}
      >
        {rightBannerConfigs.map((config) => (
          <BannerItem key={config.id} config={config} />
        ))}
        {children}
      </div>
      <BtcSurgeShareDialog />
      <PremiumShareDialog />
    </>
  );
}
