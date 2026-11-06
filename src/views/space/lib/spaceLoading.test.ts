import { describe, expect, it } from "vitest";
import {
  isSpaceLoadingComplete,
  resolveServerLoadStage,
  resolveSpaceLoadingPercent,
  type ServerLoadStageInput,
  type SpaceLoadStages,
} from "./spaceLoading";

const createServerInput = (
  overrides: Partial<ServerLoadStageInput> = {},
): ServerLoadStageInput => ({
  presenceStatus: "offline",
  hasSessionError: false,
  isConnectionConfigured: true,
  isDummyMode: false,
  isServerTimedOut: false,
  ...overrides,
});

describe("resolveServerLoadStage", () => {
  it("시작 전 offline 은 아직 기다림", () => {
    expect(resolveServerLoadStage(createServerInput())).toBe("pending");
    expect(resolveServerLoadStage(createServerInput({ presenceStatus: "connecting" }))).toBe(
      "pending",
    );
  });

  it("online 이면 완료", () => {
    expect(resolveServerLoadStage(createServerInput({ presenceStatus: "online" }))).toBe("done");
  });

  it("에러나 시간 초과면 실패로 넘어감", () => {
    expect(resolveServerLoadStage(createServerInput({ hasSessionError: true }))).toBe("failed");
    expect(resolveServerLoadStage(createServerInput({ isServerTimedOut: true }))).toBe("failed");
  });

  it("더미 측정이나 접속 주소가 없으면 건너뜀", () => {
    expect(resolveServerLoadStage(createServerInput({ isDummyMode: true }))).toBe("skipped");
    expect(resolveServerLoadStage(createServerInput({ isConnectionConfigured: false }))).toBe(
      "skipped",
    );
  });
});

describe("isSpaceLoadingComplete", () => {
  const pendingStages: SpaceLoadStages = { map: "pending", avatar: "done", server: "done" };

  it("하나라도 남으면 안 끝남", () => {
    expect(isSpaceLoadingComplete(pendingStages, false)).toBe(false);
  });

  it("서버 실패는 끝난 것으로 봄", () => {
    expect(isSpaceLoadingComplete({ map: "done", avatar: "done", server: "failed" }, false)).toBe(
      true,
    );
  });

  it("상한을 넘기면 무조건 끝남", () => {
    expect(isSpaceLoadingComplete(pendingStages, true)).toBe(true);
  });
});

describe("resolveSpaceLoadingPercent", () => {
  it("아무것도 안 끝났으면 0", () => {
    expect(
      resolveSpaceLoadingPercent({ map: "pending", avatar: "pending", server: "pending" }, 0),
    ).toBe(0);
  });

  it("에셋을 다 받아도 단계가 안 끝나면 100 에 닿지 않음", () => {
    const percent = resolveSpaceLoadingPercent(
      { map: "pending", avatar: "pending", server: "pending" },
      100,
    );

    expect(percent).toBeLessThan(100);
  });

  it("모두 끝나면 100", () => {
    expect(resolveSpaceLoadingPercent({ map: "done", avatar: "done", server: "failed" }, 30)).toBe(
      100,
    );
  });
});
