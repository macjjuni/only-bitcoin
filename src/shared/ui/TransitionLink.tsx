"use client";

import { usePathname } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { type ComponentPropsWithoutRef, type MouseEvent, useCallback } from "react";
import { allRouteList } from "@/shared/config/route";
import { setTransitionDirection } from "@/shared/lib/transition";

export default function TransitionLink({
  href,
  children,
  onClick,
  className = "",
  ...restProps
}: ComponentPropsWithoutRef<"a">) {
  // region [Hooks]
  const router = useTransitionRouter();
  const pathname = usePathname();
  // endregion

  // region [Helpers]
  const updateTransitionDirection = useCallback(
    (to: string) => {
      const fromIdx = allRouteList.findIndex((nav) => nav.path === pathname);
      const toIdx = allRouteList.findIndex((nav) => nav.path === to);

      // 방향 결정: 인덱스가 작아지면 오른쪽(Back), 커지면 왼쪽(Forward)
      setTransitionDirection(toIdx < fromIdx ? "right" : "left");
    },
    [pathname],
  );
  // endregion

  // region [Events]
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    if (!e.defaultPrevented) {
      e.preventDefault();

      const targetHref = href as string;
      if (pathname === targetHref) return;

      updateTransitionDirection(targetHref);

      router.push(targetHref);
    }
  };
  // endregion

  return (
    <a
      {...restProps}
      href={href}
      onClick={handleClick}
      className={`touch-callout-none select-none tap-highlight-transparent ${className}`.trim()}
    >
      {children}
    </a>
  );
}
