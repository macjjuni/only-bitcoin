"use client";

import type { ReactNode } from "react";
import { useFadeInByPath } from "@/shared/lib/hooks";

export default function Content({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // region [States]
  const fadeInClasses = useFadeInByPath();
  // endregion

  return (
    <main
      className={[
        "only-btc__content",
        "flex flex-col flex-1 min-h-0 w-full mx-auto max-w-layout",
        "overflow-y-auto overflow-x-hidden",
        "pt-[theme(height.header)]",
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
