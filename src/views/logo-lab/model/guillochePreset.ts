import type { LogoEffectPresetBase } from "@/shared/lib/wordmark-canvas";

/**
 * 지폐 기요셰 시안 프리셋.
 *
 * 글자 안을 지폐 위조 방지 곡선으로 채움. 사이퍼펑크와 정반대인 '건전화폐·인쇄물' 톤이라
 * 다른 시안들과 비교 기준점 역할을 함. 선이 가늘어서 대형에서 진가가 나옴.
 */

// region [Types]
/**
 * - `wave`: 위상이 엇갈린 사인파 두 묶음이 꼬여 띠를 만듦. 지폐 테두리 문양.
 * - `rosette`: 반지름이 출렁이는 동심원 묶음. 지폐 중앙 로제트.
 */
export type GuillochePattern = "wave" | "rosette";

export interface GuillochePreset extends LogoEffectPresetBase {
  pattern: GuillochePattern;
  lineColor: string;
  /** 선 아래 깔리는 글자 본체 색. */
  bodyColor: string;
  bodyAlpha: number;
  lineWidthInCssPx: number;
  /** 선( 또는 동심원 ) 간격. */
  spacingInCssPx: number;
  amplitudeInCssPx: number;
  /** `wave`: 파장(CSS px). `rosette`: 한 바퀴 꽃잎 수. */
  waveLengthOrPetalCount: number;
  /** `wave`: 흐르는 속도(CSS px/초). `rosette`: 회전 속도(도/초). */
  speed: number;
}
// endregion

// region [Constants]
export const GUILLOCHE_PRESETS: GuillochePreset[] = [
  {
    id: "banknote-wave",
    name: "Banknote Wave",
    description:
      "엇갈린 사인파 두 묶음이 꼬여 지폐 테두리 문양을 만듦. 문양이 옆으로 천천히 흘러 정지 화면처럼 보이다가 오래 보면 움직임이 느껴지는 정도.",
    pattern: "wave",
    lineColor: "#F7931A",
    bodyColor: "#F7931A",
    bodyAlpha: 0.16,
    lineWidthInCssPx: 0.55,
    spacingInCssPx: 1.9,
    amplitudeInCssPx: 1.7,
    waveLengthOrPetalCount: 13,
    speed: 6,
  },
  {
    id: "rosette",
    name: "Rosette",
    description:
      "꽃잎 18장짜리 로제트가 로고 중심에서 천천히 돔. 아이콘에서는 원 안에 로제트가 딱 맞아 실제 지폐 인장처럼 보임. 워드마크보다 아이콘 쪽 후보.",
    pattern: "rosette",
    lineColor: "#F5C783",
    bodyColor: "#F7931A",
    bodyAlpha: 0.24,
    lineWidthInCssPx: 0.5,
    spacingInCssPx: 1.8,
    amplitudeInCssPx: 1.1,
    waveLengthOrPetalCount: 18,
    speed: 5,
  },
  {
    id: "greenback",
    name: "Greenback",
    description:
      "같은 문양을 달러 지폐 녹색으로 찍은 대조군. 비트코인 사이트에 법정화폐 색을 입히는 아이러니라 실제 채택보다는 '오렌지가 맞는가' 확인용.",
    pattern: "wave",
    lineColor: "#9CC9A4",
    bodyColor: "#3E6B4A",
    bodyAlpha: 0.35,
    lineWidthInCssPx: 0.5,
    spacingInCssPx: 1.6,
    amplitudeInCssPx: 1.3,
    waveLengthOrPetalCount: 9,
    speed: 4,
  },
];
// endregion

// region [Privates]
export function formatGuillochePresetSpec(preset: GuillochePreset): string {
  return [
    preset.pattern,
    `선 ${preset.lineWidthInCssPx}px`,
    `간격 ${preset.spacingInCssPx}px`,
    `진폭 ${preset.amplitudeInCssPx}px`,
    preset.pattern === "wave"
      ? `파장 ${preset.waveLengthOrPetalCount}px · ${preset.speed}px/s`
      : `꽃잎 ${preset.waveLengthOrPetalCount} · ${preset.speed}°/s`,
  ].join(" · ");
}
// endregion
