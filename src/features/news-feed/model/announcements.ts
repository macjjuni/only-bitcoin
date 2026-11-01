import type { NewsItem } from "./types";

/**
 * 서비스 공지.
 *
 * 사고 연표와 달리 **노출 기간**으로 끝낸다. 사고 소식은 `/incidents` 방문 기록으로
 * 지워지지만, 새 기능 공지는 "봤다" 는 기준을 따로 만들어야 하고 그러려면 저장소가
 * 하나 더 생긴다. 홍보는 짧게 하고 스스로 사라지는 쪽이 맞다.
 *
 * `until` 은 **그날이 끝날 때까지** 노출한다는 뜻이다(현지 시각 자정). 날짜만 적고
 * 시각을 신경 쓰지 않아도 되게 한다.
 */
export interface ServiceAnnouncement extends NewsItem {
  /** 노출 마지막 날 (`YYYY-MM-DD`, 현지 시각). */
  until: string;
}

export const SERVICE_ANNOUNCEMENTS: readonly ServiceAnnouncement[] = [
  {
    id: "announcement:btc-space",
    label: "새 기능",
    title: "BTC 스페이스 오픈 · 3D 공간에서 시세 보며 대화하기",
    href: "/space",
    until: "2026-11-03",
  },
];

/**
 * 아직 기간이 남은 공지 중 첫 번째.
 *
 * 목록 순서가 곧 우선순위다. 날짜 문자열은 `YYYY-MM-DD` 만 받고, 그날 자정까지를
 * 유효로 본다 — `new Date("2026-11-03")` 은 UTC 자정이라 한국에서 9시간 일찍
 * 끝나므로 직접 자정을 만든다.
 */
export const findActiveAnnouncement = (
  announcements: readonly ServiceAnnouncement[],
  nowMs: number,
): ServiceAnnouncement | null => {
  for (const announcement of announcements) {
    const [year, month, day] = announcement.until.split("-").map(Number);

    if (!year || !month || !day) {
      continue;
    }

    // 다음 날 0시 직전까지 유효하다.
    const expiresAtMs = new Date(year, month - 1, day + 1).getTime();

    if (nowMs < expiresAtMs) {
      return announcement;
    }
  }

  return null;
};
