import { useEffect, useState } from "react";
import { NOTICE_BOX_COOKIE_PREFIX } from "@/shared/constants/setting";
import { deleteCookie, getCookie, setCookie } from "@/shared/utils/cookie";
import type { NoticeData, NoticeItem } from "./types";

// region [Privates]
/**
 * "YYYY-MM-DD HH:mm" 형식을 KST 기준 timestamp로 변환.
 */
const parseKstDate = (dateStr: string): number => {
  return new Date(`${dateStr.replace(" ", "T")}+09:00`).getTime();
};

/**
 * 현재 날짜 기준으로 유효한 공지인지 확인.
 */
const isWithinDateRange = (item: NoticeItem, now: number): boolean => {
  const start = parseKstDate(item.startDate);
  const end = parseKstDate(item.endDate);
  return now >= start && now <= end;
};

/**
 * 해당 공지의 dismiss 쿠키가 존재하는지 확인.
 */
const isDismissed = (id: string): boolean => {
  return getCookie(`${NOTICE_BOX_COOKIE_PREFIX}${id}`) !== null;
};

/**
 * dismiss 쿠키의 만료일을 계산한다. (endDate까지 남은 일수와 90일 중 작은 값)
 */
const calcDismissDays = (endDate: string): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilEnd = Math.ceil((parseKstDate(endDate) - Date.now()) / msPerDay);
  return Math.max(1, Math.min(daysUntilEnd, 90));
};

// endregion

export default function useNoticeData() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  // region [Privates]

  /**
   * 세션 닫기: 쿠키 설정 없이 현재 세션에서만 숨김.
   */
  const closeNotice = (id: string) => {
    setNotices((prev) => prev.filter((item) => item.id !== id));
  };

  /**
   * 영구 닫기: 쿠키를 설정하여 다음 방문에도 숨김.
   */
  const dismissNotice = (id: string, endDate: string) => {
    setCookie(`${NOTICE_BOX_COOKIE_PREFIX}${id}`, "1", calcDismissDays(endDate));
    setNotices((prev) => prev.filter((item) => item.id !== id));
  };

  // endregion

  // region [Life Cycles]

  useEffect(() => {
    fetch("/notice.json")
      .then((res) => res.json())
      .then((data: NoticeData) => {
        const now = Date.now();
        const validNotices = data.notices.filter(
          (item) => item.enabled && isWithinDateRange(item, now) && !isDismissed(item.id),
        );
        setNotices(validNotices);
      })
      .catch((err) => {
        console.error("[NoticeBox] Failed to fetch notice.json:", err);
      });
  }, []);

  // endregion

  /**
   * [DEV] 모든 공지 dismiss 쿠키를 삭제하고 다시 fetch.
   */
  const resetAllCookies = () => {
    document.cookie.split("; ").forEach((c) => {
      const key = c.split("=")[0];
      if (key.startsWith(NOTICE_BOX_COOKIE_PREFIX)) {
        deleteCookie(key);
      }
    });
    window.location.reload();
  };

  return { notices, closeNotice, dismissNotice, resetAllCookies };
}
