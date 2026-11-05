import { describe, expect, it } from "vitest";
import {
  resolveScreenMaterialCacheKey,
  SCREEN_TEXTURE_LOD_BIAS,
  sharpenScreenMapSampling,
} from "@/views/space/lib/screenMaterial";

describe("sharpenScreenMapSampling", () => {
  it("map 샘플링을 음수 바이어스를 준 호출로 바꾼다", () => {
    const shader = { fragmentShader: "void main() {\n#include <map_fragment>\n}" };

    sharpenScreenMapSampling(shader);

    expect(shader.fragmentShader).not.toContain("#include <map_fragment>");
    expect(shader.fragmentShader).toContain(
      `texture2D( map, vMapUv, ${SCREEN_TEXTURE_LOD_BIAS.toFixed(2)} )`,
    );
    expect(SCREEN_TEXTURE_LOD_BIAS).toBeLessThan(0);
  });

  it("다른 재질과 프로그램을 섞지 않도록 고유 캐시 키를 쓴다", () => {
    expect(resolveScreenMaterialCacheKey()).toContain("space-screen-lod-bias");
  });
});
