import { describe, expect, it } from "vitest";
import { normalizeServiceKey } from "./aptTrade.server";

/** 실제 발급 키 형태 ( 뒷부분만 ) */
const ENCODED_TAIL = "yl%2BvRkfaLXVJ2YDnyuStwINyyqBwpUrO4cdahc%2Bz7054QsexZTetyZkDqQ%3D%3D";
const DECODED_TAIL = "yl+vRkfaLXVJ2YDnyuStwINyyqBwpUrO4cdahc+z7054QsexZTetyZkDqQ==";

describe("normalizeServiceKey", () => {
  it("인코딩된 키를 이중 인코딩하지 않는다", () => {
    const normalized = normalizeServiceKey(ENCODED_TAIL);

    expect(normalized).toBe(ENCODED_TAIL);
    expect(normalized).not.toContain("%25");
  });

  it("디코딩된 키를 URL 안전한 형태로 인코딩한다", () => {
    const normalized = normalizeServiceKey(DECODED_TAIL);

    expect(normalized).toBe(ENCODED_TAIL);
    expect(normalized).not.toContain("+");
  });

  it("두 형태 모두 같은 결과로 수렴한다", () => {
    expect(normalizeServiceKey(ENCODED_TAIL)).toBe(normalizeServiceKey(DECODED_TAIL));
  });

  it("여러 번 적용해도 값이 변하지 않는다", () => {
    const once = normalizeServiceKey(ENCODED_TAIL);

    expect(normalizeServiceKey(once)).toBe(once);
  });

  it("잘못된 % 시퀀스가 있어도 던지지 않는다", () => {
    expect(() => normalizeServiceKey("abc%zz")).not.toThrow();
  });

  it("빈 문자열도 처리한다", () => {
    expect(normalizeServiceKey("")).toBe("");
  });
});
