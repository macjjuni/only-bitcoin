import { describe, expect, it } from "vitest";
import {
  ChatValidationError,
  createReplySnippet,
  filterAdultTerms,
  normalizeChatMessage,
  normalizeNickname,
} from "./textValidation";

describe("chat text validation", () => {
  it("연속 반복과 개행을 정규화한다", () => {
    expect(normalizeChatMessage("가가가가가가가가가가가가\n\n\n다")).toBe(
      "가가가가가가가가가가\n\n다",
    );
  });

  it("링크와 연락처를 거부한다", () => {
    expect(() => normalizeChatMessage("example[.]com에서 봐요")).toThrow(ChatValidationError);
    expect(() => normalizeChatMessage("010-1234-5678")).toThrow(ChatValidationError);
  });

  it("선정성 표현과 구분자 우회를 저장 전에 치환한다", () => {
    expect(filterAdultTerms("앞 야.동 뒤 포르노")).toBe("앞 🔞 뒤 🔞");
  });

  it("닉네임의 사칭과 emoji를 거부한다", () => {
    expect(() => normalizeNickname("공식운영자")).toThrow(ChatValidationError);
    expect(() => normalizeNickname("사토시🚀")).toThrow(ChatValidationError);
  });

  it("답글 snippet을 한 줄 40 grapheme으로 제한한다", () => {
    expect(createReplySnippet(`${"가".repeat(45)}\n나`)).toBe("가".repeat(40));
  });
});
