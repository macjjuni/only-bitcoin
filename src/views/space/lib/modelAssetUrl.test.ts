import { describe, expect, it } from "vitest";
import { resolveVersionedModelUrl } from "./modelAssetUrl";

describe("resolveVersionedModelUrl", () => {
  const versions = { "pepe.glb": "abc123", "pepe-walk.bin": "def456" };

  it("파일 이름에 맞는 해시를 붙임", () => {
    expect(resolveVersionedModelUrl("/models/pepe.glb", versions)).toBe(
      "/models/pepe.glb?v=abc123",
    );
    expect(resolveVersionedModelUrl("/models/pepe-walk.bin", versions)).toBe(
      "/models/pepe-walk.bin?v=def456",
    );
  });

  it("표에 없으면 주소를 그대로 둠", () => {
    expect(resolveVersionedModelUrl("/models/crew.glb", versions)).toBe("/models/crew.glb");
    expect(resolveVersionedModelUrl("/models/crew.glb", {})).toBe("/models/crew.glb");
  });
});
