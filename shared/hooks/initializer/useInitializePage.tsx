"use client";

import { useEffect } from "react";
import { useTransitionRouter } from 'next-view-transitions'
import { usePathname } from "next/navigation";
import useStore from "@/shared/stores/store";

export default function useInitializePage() {
  const pathname = usePathname();
  const router = useTransitionRouter();
  const initialPath = useStore((state) => state.setting.initialPath);

  useEffect(() => {
    if (pathname === "/") {
      router.replace(initialPath);
    }
  }, [pathname, router, initialPath]);
}