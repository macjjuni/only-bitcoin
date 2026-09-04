import { describe, expect, it } from "vitest";
import { countGraphemes, truncateGraphemes } from "./countGraphemes";

describe("grapheme utilities", () => {
  it("한글 조합 문자와 emoji ZWJ 시퀀스를 각각 하나로 센다", () => {
    expect(countGraphemes("가👨‍👩‍👧‍👦")).toBe(2);
  });

  it("grapheme 경계를 깨지 않고 자른다", () => {
    expect(truncateGraphemes("가나다👨‍👩‍👧‍👦", 3)).toBe("가나다");
  });
});
