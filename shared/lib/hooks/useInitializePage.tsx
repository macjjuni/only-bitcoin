"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import useSettingStore from "@/shared/stores/settingStore";

export default function useInitializePage() {
  // region [Hooks]
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPath = useSettingStore((state) => state.setting.initialPath);
  // endregion

  // region [Privates]
  const handleInitialRedirect = () => {
    if (pathname === "/") {
      const queryString = searchParams.toString();
      const redirectUrl = queryString ? `${initialPath}?${queryString}` : initialPath;

      router.replace(redirectUrl);
    }
  };
  // endregion
  // region [Life Cycles]
  useEffect(() => {
    handleInitialRedirect();
  }, [pathname, router, initialPath, searchParams]);
  // endregion
}
