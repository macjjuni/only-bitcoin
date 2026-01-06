"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import useStore from "@/shared/stores/store";

export default function useInitializePage() {
  const pathname = usePathname();
  const router = useRouter();
  const initialPath = useStore((state) => state.setting.initialPath);

  useEffect(() => {
    if (pathname === "/") {
      router.replace(initialPath);
    }
  }, [pathname, router, initialPath]);
}