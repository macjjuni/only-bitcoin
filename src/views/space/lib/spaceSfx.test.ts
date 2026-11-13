import { describe, expect, it } from "vitest";
import { resolveRemoteSfxGain, SPACE_REMOTE_SFX } from "./spaceSfx";

const { gain, fullDistance, silentDistance } = SPACE_REMOTE_SFX;
const LISTENER = { x: 0, z: 0 };

describe("resolveRemoteSfxGain", () => {
  it("가까이서는 내 소리의 절반으로 낸다", () => {
    expect(resolveRemoteSfxGain(LISTENER, { x: 0, z: 0 })).toBe(gain);
    expect(resolveRemoteSfxGain(LISTENER, { x: fullDistance, z: 0 })).toBe(gain);
  });

  it("멀어질수록 줄고 한도 밖은 안 낸다", () => {
    const middle = (fullDistance + silentDistance) / 2;

    expect(resolveRemoteSfxGain(LISTENER, { x: 0, z: middle })).toBeCloseTo(gain / 2);
    expect(resolveRemoteSfxGain(LISTENER, { x: silentDistance, z: 0 })).toBe(0);
    expect(resolveRemoteSfxGain(LISTENER, { x: silentDistance + 10, z: 0 })).toBe(0);
  });
});
