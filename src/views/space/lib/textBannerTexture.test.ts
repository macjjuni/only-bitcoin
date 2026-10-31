import { describe, expect, it } from "vitest";
import { SPACE_TEXT_BANNER } from "@/entities/space";
import {
  type AdTextSlot,
  createEmptyAdTextSlot,
  isBannerPlaceholder,
  resolveBannerText,
  TEXT_BANNER_PLACEHOLDER,
  TEXT_BANNER_TEXTURE,
} from "@/views/space/lib/textBannerTexture";

const createSlot = (overrides: Partial<AdTextSlot> = {}): AdTextSlot => ({
  ...createEmptyAdTextSlot(),
  ...overrides,
});

describe("resolveBannerText", () => {
  it("문구가 있으면 그대로 쓴다", () => {
    expect(resolveBannerText(createSlot({ text: "비트코인 교육 과정 모집" }))).toBe(
      "비트코인 교육 과정 모집",
    );
  });

  it("앞뒤 공백을 다듬는다", () => {
    expect(resolveBannerText(createSlot({ text: "  광고 문구  " }))).toBe("광고 문구");
  });

  it("비어 있으면 플레이스홀더를 쓴다", () => {
    expect(resolveBannerText(createEmptyAdTextSlot())).toBe(TEXT_BANNER_PLACEHOLDER);
  });

  it("공백만 있는 문구도 비어 있는 것으로 본다", () => {
    expect(resolveBannerText(createSlot({ text: "   " }))).toBe(TEXT_BANNER_PLACEHOLDER);
  });
});

describe("isBannerPlaceholder", () => {
  it("빈 슬롯과 채워진 슬롯을 구분한다", () => {
    expect(isBannerPlaceholder(createEmptyAdTextSlot())).toBe(true);
    expect(isBannerPlaceholder(createSlot({ text: "광고" }))).toBe(false);
  });
});

describe("배너 비율", () => {
  it("텍스처는 16:1 이다", () => {
    expect(TEXT_BANNER_TEXTURE.width / TEXT_BANNER_TEXTURE.height).toBeCloseTo(16, 6);
  });

  it("패널 geometry 비율이 텍스처 비율과 같다", () => {
    expect(SPACE_TEXT_BANNER.width / SPACE_TEXT_BANNER.height).toBeCloseTo(
      TEXT_BANNER_TEXTURE.width / TEXT_BANNER_TEXTURE.height,
      6,
    );
  });
});
