import { describe, expect, it } from "vitest";
import { SPACE_MAX_OCCUPANTS, type SpacePresence } from "@/entities/space";
import { resolvePresenceDisplay } from "@/views/space/lib/presenceLabel";

const createPresence = (overrides: Partial<SpacePresence> = {}): SpacePresence => ({
  status: "offline",
  occupantCount: 0,
  ...overrides,
});

describe("resolvePresenceDisplay", () => {
  it("접속 중이면 인원과 정원을 보여준다", () => {
    const display = resolvePresenceDisplay(createPresence({ status: "online", occupantCount: 12 }));

    expect(display.label).toBe(`12 / ${SPACE_MAX_OCCUPANTS}`);
    expect(display.isPulsing).toBe(false);
  });

  it("연결 중이면 숫자 대신 진행 상태를 보여주고 점을 깜빡인다", () => {
    const display = resolvePresenceDisplay(createPresence({ status: "connecting" }));

    expect(display.label).toBe("연결 중");
    expect(display.isPulsing).toBe(true);
  });

  it("오프라인이면 숫자를 보여주지 않는다", () => {
    // 네트워크가 없는데 인원 수가 남아 있어도 접속자처럼 읽히면 안 된다.
    const display = resolvePresenceDisplay(createPresence({ occupantCount: 30 }));

    expect(display.label).toBe("오프라인");
    expect(display.label).not.toContain("30");
  });

  it("상태마다 다른 점 색을 쓴다", () => {
    const dotClassNames = (["online", "connecting", "offline"] as const).map((status) => {
      return resolvePresenceDisplay(createPresence({ status })).dotClassName;
    });

    expect(new Set(dotClassNames).size).toBe(3);
  });

  it("모든 상태가 스크린리더 문구를 가진다", () => {
    for (const status of ["online", "connecting", "offline"] as const) {
      expect(resolvePresenceDisplay(createPresence({ status })).accessibleLabel).not.toBe("");
    }
  });
});
