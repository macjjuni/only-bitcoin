'use client';

import { ComponentPropsWithoutRef, MouseEvent, useCallback } from "react";
import { useTransitionRouter } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import { allRouteList } from "@/shared/config/route";

export default function TransitionLink({ href, children, onClick, ...restProps }: ComponentPropsWithoutRef<'a'>) {

  // region [Hooks]
  const router = useTransitionRouter();
  const pathname = usePathname();
  // endregion


  // region [Helpers]
  const updateTransitionDirection = useCallback((to: string) => {
    const fromIdx = allRouteList.findIndex(nav => nav.path === pathname);
    const toIdx = allRouteList.findIndex(nav => nav.path === to);

    // 방향 결정: 인덱스가 작아지면 오른쪽(Back), 커지면 왼쪽(Forward)
    const direction = toIdx < fromIdx ? 'right' : 'left';

    const html = document.documentElement;
    html.classList.remove('slide-left', 'slide-right');
    html.classList.add(`slide-${direction}`);
  }, [pathname]);
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

  return <a {...restProps} href={href} onClick={handleClick}>{children}</a>
}