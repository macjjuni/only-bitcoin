"use client";

import { usePathname } from "next/navigation";
import { hideBottomNavPathList, navigationRouteList } from "@/shared/config/route";
import { TransitionLink } from "@/shared/ui";
import { vibrate } from "@/shared/utils/device";

export default function BottomNavigation() {
  // region [Hooks]
  const pathname = usePathname();
  // endregion

  // region [Events]
  const onClickNavItem = () => {
    vibrate();
  };
  // endregion

  // 몰입형 페이지는 하단 네비게이션을 렌더링하지 않는다.
  if (hideBottomNavPathList.includes(pathname)) {
    return null;
  }

  return (
    <nav
      className={[
        "fixed bottom-0 left-0 z-[10] h-bottom-nav w-full px-4 pb-5 overflow-hidden",
        "layout-max:left-1/2 layout-max:max-w-[calc(theme(maxWidth.layout)-2px)] layout-max:-translate-x-1/2",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ul
        className={[
          "only-btc__bottom-nav border-[0.75px] border-neutral-300 dark:border-neutral-600",
          "flex h-full w-full px-3.5 items-center justify-around rounded-full select-none",
          "bg-neutral-200/50 dark:bg-neutral-900/30 backdrop-blur-[4px]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {navigationRouteList.map(({ path, icon, subtitle }) => {
          const isActive = pathname.includes(path);

          return (
            <li key={path} className="relative z-0">
              <TransitionLink
                href={path}
                onClick={onClickNavItem}
                className={`relative flex flex-col gap-1 items-center justify-center rounded-lg press-feedback z-10 ${
                  isActive ? "text-[#F7931A]" : "text-black dark:text-white"
                } w-[60px] h-[60px]`}
              >
                {isActive && (
                  <span className="absolute top-[9px] right-[12px] w-[5px] h-[5px] bg-bitcoin rounded-full" />
                )}
                <span className="inline-flex justify-center items-center h-[26px]">{icon}</span>
                <span
                  className={[
                    "text-[10px] tracking-wide whitespace-nowrap",
                    isActive ? "font-bold" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {subtitle}
                </span>
              </TransitionLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
