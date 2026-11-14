import { describe, expect, it } from "vitest";
import { resolveBgmUrl } from "./spaceBgmTrack";

describe("resolveBgmUrl", () => {
  it("배포본은 커밋을 박은 jsDelivr 주소를 쓴다", () => {
    expect(resolveBgmUrl("abc123", "cafe-piano.mp3", false)).toBe(
      "https://cdn.jsdelivr.net/gh/macjjuni/only-bitcoin@abc123/media/cafe-piano.mp3",
    );
  });

  it("개발 서버는 커밋과 무관하게 저장소의 media 를 바로 읽는다", () => {
    expect(resolveBgmUrl("abc123", "cafe-piano.mp3", true)).toBe("/dev-media/cafe-piano.mp3");
  });
});
