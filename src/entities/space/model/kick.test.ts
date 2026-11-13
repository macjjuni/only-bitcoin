import { describe, expect, it } from "vitest";
import { resolveKickAdmission, resolveKickServerIntervalMs } from "./kick";

const COOLDOWN_MS = 1_000;
/** 쿨다운 1초의 도착 지연 여유. */
const TOLERANCE_MS = COOLDOWN_MS - resolveKickServerIntervalMs(COOLDOWN_MS);

// region [Privates]
/** `arrivals` 시각에 온 공격을 차례로 넣어 받은 것만 돌려줌. */
const admitAll = (arrivals: readonly number[], cooldownMs = COOLDOWN_MS): number[] => {
  const accepted: number[] = [];
  let readyAt: number | undefined;

  for (const nowMs of arrivals) {
    const admission = resolveKickAdmission(nowMs, readyAt, cooldownMs);

    readyAt = admission.readyAt;
    if (admission.isAccepted) {
      accepted.push(nowMs);
    }
  }

  return accepted;
};
// endregion

describe("resolveKickAdmission", () => {
  it("첫 공격은 받고 다음 기준 시각을 쿨다운 뒤로 잡는다", () => {
    expect(resolveKickAdmission(5_000, undefined, COOLDOWN_MS)).toEqual({
      isAccepted: true,
      readyAt: 6_000,
    });
  });

  it("기준보다 여유만큼 일찍 온 것까지 받고, 그보다 이르면 버리며 기준 시각은 안 바뀐다", () => {
    expect(resolveKickAdmission(6_000 - TOLERANCE_MS, 6_000, COOLDOWN_MS).isAccepted).toBe(true);
    expect(resolveKickAdmission(6_000 - TOLERANCE_MS - 1, 6_000, COOLDOWN_MS)).toEqual({
      isAccepted: false,
      readyAt: 6_000,
    });
  });

  it("쿨다운에 맞춰 누른 공격은 도착이 앞뒤로 흔들려도 전부 받는다", () => {
    // 버튼은 정확히 1초마다 눌렸고 도착만 ±200 ms 흔들림.
    const jitters = [0, 180, -150, 200, -200, 90, -60, 200, -200, 0];
    const arrivals = jitters.map((jitter, index) => 10_000 + index * COOLDOWN_MS + jitter);

    expect(admitAll(arrivals)).toEqual(arrivals);
  });

  it("여유를 매번 쓰려는 연타는 처음 한 번만 일찍 통하고 그 뒤로는 쿨다운 박자다", () => {
    const earlyGap = COOLDOWN_MS - TOLERANCE_MS;
    const arrivals = Array.from({ length: 21 }, (_, index) => index * earlyGap);
    const accepted = admitAll(arrivals);

    // 10초 동안. 전에는 21번이 다 통했음.
    expect(accepted.length).toBeLessThanOrEqual(11);
    // 두 번째만 일찍 통하고, 그다음부터는 1초 간격임.
    expect(accepted.slice(0, 4)).toEqual([0, earlyGap, earlyGap * 3, earlyGap * 5]);
  });

  it("쉰 시간을 모아 두었다 몰아 때릴 수 없다", () => {
    // 한 번 때리고 30초 쉰 뒤 10 ms 간격으로 다섯 번.
    const accepted = admitAll([0, 30_000, 30_010, 30_020, 30_030, 30_040]);

    expect(accepted).toEqual([0, 30_000]);
  });
});
