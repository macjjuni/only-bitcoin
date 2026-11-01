import { BITCOIN_COLOR } from "@/shared/config/color";
import { spaceConfig } from "@/shared/config/space";
import { resolveFittedFontSize } from "./billboardTexture";

/**
 * 텍스트 전용 광고 배너 텍스처.
 *
 * 패널(9.6 × 0.8)과 같은 12:1 이다. 비율이 어긋나면 글자가 늘어난다.
 */
export const TEXT_BANNER_TEXTURE = {
  width: 1440,
  height: 120,
  paddingX: 48,
  maxFontSizePx: 72,
  minFontSizePx: 28,
} as const;

export const TEXT_BANNER_COLORS = {
  background: "#0a0f16",
  border: "#1f2a3b",
  text: "#e6ecf5",
  placeholder: "#6d788c",
  accent: BITCOIN_COLOR,
} as const;

/**
 * 비어 있는 배너에 그리는 안내.
 *
 * 연락처를 함께 붙인다. "광고를 실을 수 있습니다" 만 적고 연락할 곳을 주지
 * 않으면 보는 사람이 할 수 있는 일이 없다. 연락처 파싱이 실패하면 안내만 남는다.
 */
export const TEXT_BANNER_PLACEHOLDER =
  spaceConfig.adContactLabel === ""
    ? "이 자리에 광고를 실을 수 있습니다"
    : `이 자리에 광고를 실을 수 있습니다 · 문의 ${spaceConfig.adContactLabel}`;

const SANS_FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

/** 배너 한 줄 광고 슬롯. 3단계에서 라이트닝 결제로 판매한다. */
export interface AdTextSlot {
  /** `null` 이면 플레이스홀더를 그린다. */
  text: string | null;
  linkUrl: string | null;
  expiresAt: number | null;
}

export const createEmptyAdTextSlot = (): AdTextSlot => ({
  text: null,
  linkUrl: null,
  expiresAt: null,
});

/** 공백만 있는 문구는 비어 있는 것으로 본다. */
export const resolveBannerText = (slot: AdTextSlot): string => {
  const trimmedText = slot.text?.trim() ?? "";

  return trimmedText === "" ? TEXT_BANNER_PLACEHOLDER : trimmedText;
};

export const isBannerPlaceholder = (slot: AdTextSlot): boolean => {
  return resolveBannerText(slot) === TEXT_BANNER_PLACEHOLDER;
};

// region [Privates]
const drawBannerBackground = (context: CanvasRenderingContext2D): void => {
  const { width, height } = TEXT_BANNER_TEXTURE;

  context.fillStyle = TEXT_BANNER_COLORS.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = TEXT_BANNER_COLORS.border;
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, width - 3, height - 3);
};

/** 양 끝 장식. 빈 배너가 그냥 검은 띠로 보이지 않게 한다. */
const drawEdgeMarks = (context: CanvasRenderingContext2D): void => {
  const { width, height } = TEXT_BANNER_TEXTURE;
  const markWidth = 6;
  const markHeight = height * 0.42;
  const markY = (height - markHeight) / 2;

  context.fillStyle = TEXT_BANNER_COLORS.accent;
  context.fillRect(TEXT_BANNER_TEXTURE.paddingX / 2, markY, markWidth, markHeight);
  context.fillRect(
    width - TEXT_BANNER_TEXTURE.paddingX / 2 - markWidth,
    markY,
    markWidth,
    markHeight,
  );
};
// endregion

/**
 * 배너 한 장을 그린다.
 *
 * 문구 길이를 제한하는 대신 가용 폭에 맞춰 글자를 줄인다. 길이로 자르면
 * 광고주가 쓸 수 있는 문구가 글자 수에 묶인다.
 */
export const drawTextBanner = (context: CanvasRenderingContext2D, slot: AdTextSlot): void => {
  const { width, height, paddingX, maxFontSizePx, minFontSizePx } = TEXT_BANNER_TEXTURE;
  const bannerText = resolveBannerText(slot);
  const maxWidth = width - paddingX * 2;

  drawBannerBackground(context);
  drawEdgeMarks(context);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${maxFontSizePx}px ${SANS_FONT_STACK}`;

  const fittedFontSize = resolveFittedFontSize(context.measureText(bannerText).width, {
    maxWidth,
    maxFontSizePx,
    minFontSizePx,
  });

  if (fittedFontSize !== maxFontSizePx) {
    context.font = `700 ${fittedFontSize}px ${SANS_FONT_STACK}`;
  }

  context.fillStyle = isBannerPlaceholder(slot)
    ? TEXT_BANNER_COLORS.placeholder
    : TEXT_BANNER_COLORS.text;
  context.fillText(bannerText, width / 2, height / 2 + 2);
};
