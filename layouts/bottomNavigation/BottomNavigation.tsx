"use client";

import { TransitionLink } from "@/components";
import { usePathname } from "next/navigation";
import { navigationRouteList } from "@/shared/constants/route";

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className={[
      'only-btc__bottom-nav',
      'fixed bottom-0 left-0 z-[1] h-bottom-nav overflow-hidden border-t border-border bg-transparent pb-2 backdrop-blur-[8px]',
      'w-full layout-max:left-1/2 layout-max:max-w-[calc(theme(maxWidth.layout)-2px)] layout-max:-translate-x-1/2'
    ].filter(Boolean).join(' ')}>
      <ul className="flex h-full w-full items-center justify-around">
        {navigationRouteList.map(({ path, icon }) => {
          const isActive = pathname.includes(path);

          return (
            <li key={path} className="relative z-0">
              <TransitionLink
                href={path}
                className={`flex items-center justify-center rounded-lg p-3 transition-colors tap-highlight-transparent z-10 ${
                  isActive
                    ? "text-[#F7931A]"
                    : "text-black dark:text-white"
                }`}
              >
                <span className="inline-block text-[0px]">
                  {icon}
                </span>
              </TransitionLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}