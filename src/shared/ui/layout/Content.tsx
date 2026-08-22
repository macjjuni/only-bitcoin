"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { hideHeaderPathList } from "@/shared/config/route";
import { useFadeInByPath } from "@/shared/lib/hooks";

export default function Content({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // region [Hooks]
  const pathname = usePathname();
  const fadeInClasses = useFadeInByPath();
  const hasHeader = !hideHeaderPathList.includes(pathname);
  // endregion

  return (
    <main
      className={[
        "only-btc__content",
        `flex flex-col flex-1 min-h-0 w-full mx-auto max-w-layout${hasHeader ? " pt-header" : ""}`,
        "overflow-y-auto overflow-x-hidden overscroll-contain",
        "transition-opacity duration-500 ease-in-out",
        fadeInClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </main>
  );
}
