"use client";

import { KIcon } from "kku-ui";
import { usePathname } from "next/navigation";
import { hideHeaderPathList } from "@/shared/config/route";
import useSettingStore from "@/shared/stores/settingStore";
import { TransitionLink } from "@/shared/ui";
import ConnectionDot from "./components/connection-dot/ConnectionDot";
import SettingButton from "./components/setting-button/SettingButton";

export default function Header() {
  // region [Hooks]
  const pathname = usePathname();
  const initialPath = useSettingStore((state) => state.setting.initialPath);
  // endregion

  // 몰입형 페이지는 헤더를 렌더링하지 않는다.
  if (hideHeaderPathList.includes(pathname)) {
    return null;
  }

  return (
    <header
      className={[
        "only-btc__header",
        "relative shrink-0 bg-background",
        "flex justify-between items-center gap-1 w-full h-header p-2 pb-1.5",
        "z-[10] select-none tap-highlight-transparent",
        // 하단 그라데이션 (ease-out 곡선 근사 스탑으로 자연스럽게 페이드)
        "after:content-[''] after:absolute after:top-full after:left-0 after:w-full after:h-[20px] after:pointer-events-none",
        "after:bg-[linear-gradient(to_bottom,hsl(var(--background))_0%,hsl(var(--background)/0.87)_14%,hsl(var(--background)/0.7)_28%,hsl(var(--background)/0.5)_42%,hsl(var(--background)/0.32)_56%,hsl(var(--background)/0.17)_70%,hsl(var(--background)/0.07)_84%,hsl(var(--background)/0)_100%)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="font-bold tracking-[-1px] text-current">
        <TransitionLink
          href={initialPath}
          className="flex justify-start items-center gap-2 text-current dark:text-current !no-underline
              text-3xl font-bold"
        >
          <KIcon id="bitcoin" icon="bitcoin" size={36} />
          ₿itcoin
        </TransitionLink>
      </h2>

      <div className="flex justify-center items-center gap-1">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
}
