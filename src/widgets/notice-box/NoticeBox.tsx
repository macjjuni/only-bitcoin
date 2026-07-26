"use client";

import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { hideBottomNavPathList } from "@/shared/config/route";
import { NoticeCard } from "@/shared/ui";
import { isDev } from "@/shared/utils/common";
import useNoticeData from "./model/useNoticeData";

const EXIT_DURATION = 250;

export default function NoticeBox() {
  // region [Hooks]
  const pathname = usePathname();
  const { notices, closeNotice, dismissNotice, resetAllCookies } = useNoticeData();
  const [isExiting, setIsExiting] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const hasBottomNav = !hideBottomNavPathList.includes(pathname);
  // endregion

  // region [Privates]
  const exitThenAction = useCallback((action: () => void) => {
    setIsExiting(true);
    pendingActionRef.current = action;
    setTimeout(() => {
      pendingActionRef.current?.();
      pendingActionRef.current = null;
      setIsExiting(false);
    }, EXIT_DURATION);
  }, []);
  // endregion

  if (notices.length === 0) {
    return null;
  }

  const current = notices[0];


  // region [Events]
  const onClickConfirm = () => {
    exitThenAction(() => closeNotice(current.id));
  };

  const onClickDismiss = () => {
    exitThenAction(() => dismissNotice(current.id, current.endDate));
  };
  // endregion


  return (
    <div
      className={[
        "only-btc__notice-box",
        "fixed left-0 z-[10] pl-2 pb-9 pointer-events-none",
        hasBottomNav ? "bottom-bottom-nav" : "bottom-0",
        "layout-max:left-1/2 layout-max:w-full layout-max:max-w-[calc(theme(maxWidth.layout)-2px)] layout-max:-translate-x-1/2",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-auto">
        <NoticeCard
          title={current.title}
          message={current.message}
          link={current.link}
          linkLabel={current.linkLabel}
          isExiting={isExiting}
          onClickConfirm={onClickConfirm}
          onClickDismiss={onClickDismiss}
          onClickResetCookie={isDev ? resetAllCookies : undefined}
        />
      </div>
    </div>
  );
}
