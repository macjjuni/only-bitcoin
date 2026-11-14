import { describe, expect, it } from "vitest";
import { resolveAvatarCombat, SPACE_AVATAR_MODELS } from "@/entities/space";
import { resolveSwingTrailPose, resolveSwingTrailStyle, SWING_TRAIL_STYLE_IDS } from "./swingTrail";

const indexOfModel = (id: string): number => {
  return SPACE_AVATAR_MODELS.findIndex((model) => model.id === id);
};

describe("휘두르기 궤적", () => {
  it("캐릭터마다 궤적이 있고 모양이 서로 다르다", () => {
    const wrench = resolveSwingTrailStyle(indexOfModel("redcrew"));
    const bat = resolveSwingTrailStyle(indexOfModel("nightshift"));
    const swatter = resolveSwingTrailStyle(indexOfModel("pepe"));

    if (!wrench || !bat || !swatter) {
      throw new Error("궤적이 없습니다.");
    }

    // 방망이가 가장 굵고 오래 남고, 파리채가 가장 짧게 스침.
    expect(bat.halfWidth).toBeGreaterThan(wrench.halfWidth);
    expect(bat.fadeSeconds).toBeGreaterThan(wrench.fadeSeconds);
    expect(swatter.fadeSeconds).toBeLessThan(wrench.fadeSeconds);
    expect(swatter.arcAngle).toBeLessThan(wrench.arcAngle);
    // 파리채만 세로로 내려침.
    expect(swatter.tiltAngle).toBeCloseTo(Math.PI / 2, 5);
    expect(new Set([wrench.color, bat.color, swatter.color]).size).toBe(3);
  });

  it("궤적을 둔 모델 이름이 실제 모델 목록에 있다", () => {
    for (const id of SWING_TRAIL_STYLE_IDS) {
      expect(indexOfModel(id)).toBeGreaterThanOrEqual(0);
    }
  });

  it.each([
    "redcrew",
    "nightshift",
    "pepe",
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

    const { startRatio, endRatio, headFromAngle, headToAngle } = style;
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
