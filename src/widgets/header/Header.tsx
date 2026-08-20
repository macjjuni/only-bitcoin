"use client";

import { KIcon } from "kku-ui";
import { usePathname } from "next/navigation";
import { env } from "@/shared/config/env";
import { useScrollDirection } from "@/shared/lib/hooks";
import { buildHeroGradientStyle } from "@/shared/config/heroGradient";
import { heroGradientPathList, hideHeaderPathList } from "@/shared/config/route";
import useSettingStore from "@/shared/stores/settingStore";
import { BtcTextLogo, TransitionLink } from "@/shared/ui";
import ConnectionDot from "./components/connection-dot/ConnectionDot";
import SettingButton from "./components/setting-button/SettingButton";

const TRANSITION_DURATION = 420;

export default function Header() {
  // region [Hooks]
  const pathname = usePathname();
  const initialPath = useSettingStore((state) => state.setting.initialPath);
  const scrollProgress = useContentScrollProgress(HERO_GRADIENT_FADE_DISTANCE_IN_PX);
  const isHeaderHidden = useScrollDirection();
  const hideGradient = pathname === "/overview" || pathname === "/" || pathname === "/btc2fiat";
  // endregion

  // 몰입형 페이지는 헤더를 안 그림.
  if (hideHeaderPathList.includes(pathname)) {
    return null;
  }

  /**
   * 히어로 페이지에서는 헤더가 히어로 그라데이션의 첫 조각을 그림.
   *
   * 다만 스크롤로 히어로가 올라가면 헤더에만 남은 틴트가 붕 뜸.
   * 그래서 틴트를 별도 레이어로 깔아 진행도만큼 걷어내고,
   * 반대로 평소 헤더의 하단 페이드를 같은 속도로 켬. ( 다 내려가면 여느 페이지와 같아짐 )
   */
  const hasHeroGradient = heroGradientPathList.includes(pathname);
  const heroTintOpacity = hasHeroGradient ? 1 - scrollProgress : 0;
  const bottomFadeOpacity = hasHeroGradient ? scrollProgress : 1;

  return (
    <header
      className={[
        "only-btc__header",
        "absolute top-0 left-0 right-0 bg-background",
        "flex justify-between items-center gap-1 w-full h-header p-2 pb-1.5",
        "z-[10] select-none tap-highlight-transparent",
        `transition-transform duration-[${TRANSITION_DURATION}ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]`,
        isHeaderHidden ? "-translate-y-full" : "translate-y-0",
        // 하단 그라데이션 (ease-out 곡선 근사 스탑으로 자연스럽게 페이드)
        !hideGradient && "after:content-[''] after:absolute after:top-full after:left-0 after:w-full after:h-[18px] after:pointer-events-none",
        !hideGradient && "after:opacity-[var(--header-fade-opacity)]",
        !hideGradient && "after:bg-[linear-gradient(to_bottom,hsl(var(--background))_0%,hsl(var(--background)/0.87)_14%,hsl(var(--background)/0.7)_28%,hsl(var(--background)/0.5)_42%,hsl(var(--background)/0.32)_56%,hsl(var(--background)/0.17)_70%,hsl(var(--background)/0.07)_84%,hsl(var(--background)/0)_100%)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasHeroGradient && (
        <div
          aria-hidden
          // 진행도를 5% 단위로 끊어 받으므로 짧은 트랜지션으로 계단을 지움.
          className="pointer-events-none absolute inset-0 transition-opacity duration-150 ease-out"
          style={{ ...buildHeroGradientStyle(0), opacity: heroTintOpacity }}
        />
      )}

      <h2
        className={`font-bold tracking-[-1px] text-current${env.NEXT_PUBLIC_LOGO ? " opacity-0" : ""}`}
      >
        <TransitionLink
          href={initialPath}
          className="flex justify-start items-center gap-2 text-current dark:text-current !no-underline
              text-3xl font-bold"
        >
          <KIcon id="bitcoin" icon="bitcoin" size={38} />
          <BtcTextLogo height={36} width={148} />
        </TransitionLink>
      </h2>

      <div className="flex justify-center items-center gap-1">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
}
