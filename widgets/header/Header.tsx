"use client";

import { KIcon } from "kku-ui";
import useSettingStore from "@/shared/stores/settingStore";
import { TransitionLink } from "@/shared/ui";
import ConnectionDot from "./components/connection-dot/ConnectionDot";
import SettingButton from "./components/setting-button/SettingButton";

export default function Header() {
  const initialPath = useSettingStore((state) => state.setting.initialPath);

  return (
    <header
      className={[
        "only-btc__header",
        "relative shrink-0 bg-background",
        "flex justify-between items-center gap-1 w-full h-header p-2",
        "z-[10] select-none tap-highlight-transparent",
        // 하단 그라데이션
        "after:content-[''] after:absolute after:top-full after:left-0 after:w-full after:h-4 after:pointer-events-none",
        "after:bg-gradient-to-b after:from-background after:to-transparent",
        "dark:after:from-background dark:after:to-transparent",
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

      <div className="flex justify-center items-center gap-2">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
}
