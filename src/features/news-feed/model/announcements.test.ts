import { describe, expect, it } from "vitest";
import {
  findActiveAnnouncement,
  SERVICE_ANNOUNCEMENTS,
  type ServiceAnnouncement,
} from "./announcements";

const createAnnouncement = (overrides: Partial<ServiceAnnouncement> = {}): ServiceAnnouncement => ({
  id: "announcement:test",
  label: "새 기능",
  title: "테스트 공지",
  href: "/space",
  until: "2026-11-03",
  ...overrides,
});

/** 현지 시각으로 만든다. `new Date("...")` 는 UTC 로 읽혀 9시간 어긋난다. */
const localTime = (year: number, month: number, day: number, hour = 0): number => {
  return new Date(year, month - 1, day, hour).getTime();
};

describe("findActiveAnnouncement", () => {
  it("마지막 날 23시에도 노출한다", () => {
    const announcements = [createAnnouncement()];

    expect(findActiveAnnouncement(announcements, localTime(2026, 11, 3, 23))).not.toBeNull();
  });

  it("다음 날 0시부터 사라진다", () => {
    const announcements = [createAnnouncement()];

    expect(findActiveAnnouncement(announcements, localTime(2026, 11, 4))).toBeNull();
  });

  it("목록 순서가 우선순위다", () => {
    const announcements = [
      createAnnouncement({ id: "announcement:first", until: "2026-11-03" }),
      createAnnouncement({ id: "announcement:second", until: "2026-12-31" }),
    ];

    expect(findActiveAnnouncement(announcements, localTime(2026, 11, 1))?.id).toBe(
      "announcement:first",
    );
  });

  it("앞 공지가 끝나면 다음 공지로 넘어간다", () => {
    const announcements = [
      createAnnouncement({ id: "announcement:first", until: "2026-11-03" }),
      createAnnouncement({ id: "announcement:second", until: "2026-12-31" }),
    ];

    expect(findActiveAnnouncement(announcements, localTime(2026, 11, 10))?.id).toBe(
      "announcement:second",
    );
  });

  it("날짜 형식이 깨진 공지는 건너뛴다", () => {
    const announcements = [
      createAnnouncement({ id: "announcement:broken", until: "나중에" }),
      createAnnouncement({ id: "announcement:valid", until: "2026-12-31" }),
    ];

    expect(findActiveAnnouncement(announcements, localTime(2026, 11, 1))?.id).toBe(
      "announcement:valid",
    );
  });

  it("남은 공지가 없으면 null 이다", () => {
    expect(findActiveAnnouncement([], localTime(2026, 11, 1))).toBeNull();
  });
});

describe("SERVICE_ANNOUNCEMENTS", () => {
  it("모든 공지가 앱 내부 경로를 가리킨다", () => {
    // 소식지는 `TransitionLink` 로 이동하므로 외부 URL 을 넣으면 라우팅이 깨진다.
    for (const announcement of SERVICE_ANNOUNCEMENTS) {
      expect(announcement.href.startsWith("/")).toBe(true);
    }
  });

  it("공지 ID 가 사고 소식과 겹치지 않는다", () => {
    for (const announcement of SERVICE_ANNOUNCEMENTS) {
      expect(announcement.id.startsWith("announcement:")).toBe(true);
    }
  });
});
