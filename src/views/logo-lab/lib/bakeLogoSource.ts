import type { BakedLogoSource, LogoSourceKind } from "@/shared/lib/wordmark-canvas";
import {
  bakeBitcoinIconCanvas,
  bakeWordmarkCanvas,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";

// region [Types]
interface BakeLogoSourceOptions {
  sourceKind: LogoSourceKind;
  widthInCssPx: number;
  heightInCssPx: number;
  fillColor: string;
  fontId: WordmarkFontId;
}
// endregion

// region [Transactions]
/** 원본 종류에 맞춰 텍스처를 구움. 아이콘은 정사각이라 짧은 변 기준. */
export async function bakeLogoSource({
  sourceKind,
  widthInCssPx,
  heightInCssPx,
  fillColor,
  fontId,
}: BakeLogoSourceOptions): Promise<BakedLogoSource> {
  if (sourceKind === "icon") {
    return bakeBitcoinIconCanvas(Math.min(widthInCssPx, heightInCssPx), fillColor);
  }
  return bakeWordmarkCanvas({ widthInCssPx, heightInCssPx, fillColor, fontId });
}
// endregion
