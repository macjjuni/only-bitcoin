"use client";

import { KIcon } from "kku-ui";
import { usePathname } from "next/navigation";
import { env } from "@/shared/config/env";
import { hideHeaderPathList } from "@/shared/config/route";
import { useScrollDirection } from "@/shared/lib/hooks";
import useSettingStore from "@/shared/stores/settingStore";
import { BtcTextLogo, TransitionLink } from "@/shared/ui";
import ConnectionDot from "./components/connection-dot/ConnectionDot";
import SettingButton from "./components/setting-button/SettingButton";

const TRANSITION_DURATION = 420;

export default function Header() {
  // region [Hooks]
  const pathname = usePathname();
  const initialPath = useSettingStore((state) => state.setting.initialPath);
  const isHeaderHidden = useScrollDirection();
  // endregion

  // 몰입형 페이지는 헤더를 안 그림.
  if (hideHeaderPathList.includes(pathname)) {
    return null;
  }

  return (
    <header
      className={[
        "only-btc__header",
        /*
          iOS 26+ 는 상단 가장자리의 `fixed`/`sticky` 박스에서만 배경색을 샘플링하고, 실패하면
          그 자리를 Liquid Glass 블러로 덮는다. `absolute` 는 샘플링 대상이 아니라 블러가 생겼으므로
          모바일 폭에서는 `fixed` 로 띄워 샘플 대상이 되게 한다.
          레이아웃 폭(524px) 이상에서는 `DefaultLayout` 의 `border-x` 를 덮지 않도록 `absolute` 로 되돌린다.
          센터링은 `transform` 대신 `inset-x-0 + mx-auto` 로 해서 숨김 애니메이션의 translate-y 와 안 겹치게 함.
        */
        "fixed layout-max:absolute top-0 inset-x-0 mx-auto max-w-layout",
        // 반투명 + 4px 블러. `bg-background/72` 는 안 됨 — tailwind.config 의 `background` 가
        // `<alpha-value>` 플레이스홀더 없는 `hsl(var(--background))` 라서 알파 수정자가 먹지 않는다.
        "bg-[hsl(var(--background)/0.72)] backdrop-blur-[4px]",
        "flex justify-between items-center gap-1 w-full h-header p-2 pb-1.5",
        "z-[10] select-none tap-highlight-transparent",
        `transition-transform duration-[${TRANSITION_DURATION}ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]`,
        isHeaderHidden ? "-translate-y-full" : "translate-y-0",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h2
        className={`font-bold tracking-[-1px] text-current${env.NEXT_PUBLIC_LOGO ? " opacity-0" : ""}`}
      >
        <TransitionLink
          href={initialPath}
          className="flex justify-start items-center gap-2 text-current dark:text-current !no-underline
              text-3xl font-bold"
        >
          <KIcon id="bitcoin" icon="bitcoin" size={30} />
          <BtcTextLogo height={32} width={132} />
        </TransitionLink>
      </h2>

      <div className="flex justify-center items-center gap-1">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
}
