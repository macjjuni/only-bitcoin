import { describe, expect, it } from "vitest";
import { hasUnseenIncident } from "./hasUnseenIncident";

describe("hasUnseenIncident", () => {
  it("확인한 적이 없으면 새 사건이 있다고 본다", () => {
    expect(hasUnseenIncident(["2026-09-bitget"], [])).toBe(true);
  });

  it("현재 사건을 모두 확인했으면 새 사건이 없다", () => {
    expect(hasUnseenIncident(["2026-09-bitget"], ["2026-09-bitget"])).toBe(false);
  });

  it("과거 날짜 사건이 나중에 추가돼도 새 사건으로 잡는다", () => {
    expect(hasUnseenIncident(["2019-06-bitrue", "2026-09-bitget"], ["2026-09-bitget"])).toBe(true);
  });

  it("확인 뒤 사건이 삭제된 경우는 새 사건으로 보지 않는다", () => {
    expect(hasUnseenIncident(["2026-09-bitget"], ["2015-02-bter", "2026-09-bitget"])).toBe(false);
  });
});
