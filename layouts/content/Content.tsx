"use client";

import React, { ReactNode } from "react";
import { useFadeInByPath } from "@/shared/hooks";

export default function Content({ children, className }: { children: ReactNode; className?: string }) {

  // region [States]
  const fadeInClasses = useFadeInByPath();
  // endregion

  return (
    <main
      className={[
        "only-btc__content",
        "flex flex-col flex-auto w-full mx-auto max-w-layout",
        "pt-[calc(theme(height.header)+16px)] pb-[calc(theme(height.bottom-nav)+8px)]",
        "overflow-auto",
        "transition-opacity duration-500 ease-in-out",
        fadeInClasses,
        className
      ].filter(Boolean).join(" ")}
    >
      {children}
    </main>
  );
}