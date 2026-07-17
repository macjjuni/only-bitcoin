"use client";

import { usePathname } from "next/navigation";
import Btc2FiatFloatingBanner from "./ui/Btc2FiatFloatingBanner";

interface BannerConfig {
  id: string;
  Component: React.ComponentType;
  useIsVisible: () => boolean;
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
  // Example of adding a common banner with multiple conditions (pathname + settings store, etc.)
  // {
  //   id: "common-banner",
  //   Component: CommonFloatingBanner,
  //   useIsVisible: () => {
  //     const pathname = usePathname();
  //     const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);
  //     return ["/btc2fiat", "/dca"].includes(pathname) && isUsdtStandard;
  //   }
  // }
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
        "fixed bottom-bottom-nav right-0 z-[10] pr-6 pb-3 pointer-events-none",
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
