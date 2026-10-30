"use client";

import { Megaphone } from "lucide-react";
import { TransitionLink } from "@/shared/ui";
import { useLatestNews } from "../model/useLatestNews";

export function NewsFloatingBanner() {
  //#region [Hooks]
  const latestNews = useLatestNews();
  //#endregion

  if (!latestNews) {
    return null;
  }

  return (
    <TransitionLink
      href={latestNews.href}
      aria-label={`${latestNews.label} 소식: ${latestNews.title}`}
      className="flex h-[52px] max-w-full items-center gap-2.5 rounded-full border border-bitcoin/40 bg-white pl-3 pr-4 shadow-md transition-transform hover:scale-[1.02] active:scale-95 dark:bg-neutral-800 tap-highlight-transparent select-none"
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bitcoin/15 text-bitcoin">
        <Megaphone size={18} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-800" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] font-bold text-bitcoin">{latestNews.label}</span>
        <span className="truncate text-sm tracking-tighter font-medium text-neutral-900 dark:text-white">
          {latestNews.title}
        </span>
      </span>
    </TransitionLink>
  );
}
