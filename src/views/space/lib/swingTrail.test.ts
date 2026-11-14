import { describe, expect, it } from "vitest";
import { resolveAvatarCombat, SPACE_AVATAR_MODELS } from "@/entities/space";
import {
  resolveSwingTrailPose,
  resolveSwingTrailStyle,
  SWING_TRAIL_STYLE_IDS,
  SWING_TRAIL_WINDOW,
} from "./swingTrail";

const indexOfModel = (id: string): number => {
  return SPACE_AVATAR_MODELS.findIndex((model) => model.id === id);
};

describe("휘두르기 궤적", () => {
  it("맥시크루와 버거빠따킹만 궤적이 있고 모양이 서로 다르다", () => {
    const wrench = resolveSwingTrailStyle(indexOfModel("redcrew"));
    const bat = resolveSwingTrailStyle(indexOfModel("nightshift"));

    expect(resolveSwingTrailStyle(indexOfModel("pepe"))).toBeNull();
    expect(wrench).not.toBeNull();
    expect(bat).not.toBeNull();
    // 방망이가 더 굵고 오래 남음.
    expect(bat?.halfWidth).toBeGreaterThan(wrench?.halfWidth ?? 0);
    expect(bat?.fadeSeconds).toBeGreaterThan(wrench?.fadeSeconds ?? 0);
    expect(bat?.color).not.toBe(wrench?.color);
  });

  it("궤적을 둔 모델 이름이 실제 모델 목록에 있다", () => {
    for (const id of SWING_TRAIL_STYLE_IDS) {
      expect(indexOfModel(id)).toBeGreaterThanOrEqual(0);
    }
  });

  it.each([
    "redcrew",
    "nightshift",
  ])("%s: 무기가 닿는 순간에 보이고 다음 공격 전에 사라진다", (id) => {
    const modelIndex = indexOfModel(id);
    const style = resolveSwingTrailStyle(modelIndex);
    const { attackSeconds, impactSeconds, cooldownMs } = resolveAvatarCombat(modelIndex);

    if (!style) {
      throw new Error("궤적이 없습니다.");
    }

    expect(resolveSwingTrailPose(style, attackSeconds, 0)).toBeNull();
    expect(resolveSwingTrailPose(style, attackSeconds, impactSeconds)).not.toBeNull();
    expect(resolveSwingTrailPose(style, attackSeconds, cooldownMs / 1000)).toBeNull();
  });

  it("오른쪽에서 왼쪽으로 쓸고, 다 쓴 뒤에는 흐려지며 커진다", () => {
    const style = resolveSwingTrailStyle(indexOfModel("nightshift"));

    if (!style) {
      throw new Error("궤적이 없습니다.");
    }

    const { startRatio, endRatio, headFromAngle, headToAngle } = SWING_TRAIL_WINDOW;
    const start = resolveSwingTrailPose(style, 1, startRatio);
    const end = resolveSwingTrailPose(style, 1, endRatio);
    const fading = resolveSwingTrailPose(style, 1, endRatio + style.fadeSeconds / 2);

    expect(start?.headAngle).toBeCloseTo(headFromAngle, 5);
    expect(end?.headAngle).toBeCloseTo(headToAngle, 5);
    expect(start?.opacity).toBe(1);
    expect(fading?.opacity).toBeLessThan(1);
    expect(fading?.scale).toBeGreaterThan(1);
  });
});
