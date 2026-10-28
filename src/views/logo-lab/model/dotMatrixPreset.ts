import type { LogoEffectPresetBase } from "@/shared/lib/wordmark-canvas";

/**
 * 도트 매트릭스 시안 프리셋.
 *
 * 거래소 전광판 LED 로 로고를 그림. 꺼진 도트까지 깔아야 전광판으로 읽혀서 박스 전체에 도트를 채움.
 * 사이퍼펑크보다 '마켓' 쪽 톤이라 시세 사이트 정체성과 붙음.
 */

// region [Types]
/**
 * - `static`: 그냥 켜져 있음. 움직임 없음.
 * - `scan`: 밝은 줄이 위에서 아래로 훑고 지나감. 전광판 리프레시 느낌.
 * - `ticker`: 로고가 오른쪽에서 왼쪽으로 흘러감. 전광판 마키.
 */
export type DotMatrixMode = "static" | "scan" | "ticker";

export interface DotMatrixPreset extends LogoEffectPresetBase {
  mode: DotMatrixMode;
  /** 도트 간격(CSS px). */
  pitchInCssPx: number;
  /** 도트 지름 / 간격. */
  dotDiameterRatio: number;
  coverageThreshold: number;
  litColor: string;
  unlitColor: string;
  /** 켜진 도트 번짐 색. null 이면 번짐 없음. */
  glowColor: string | null;
  /** `scan` 에서 훑는 줄 색. */
  scanColor: string;
  /** `scan`: 한 줄 내려가는 시간. `ticker`: 한 칸 흘러가는 시간. */
  stepInMs: number;
  /** `ticker`: 로고 뒤 빈 칸 비율( 판 폭 대비 ). */
  tickerGapRatio: number;
}
// endregion

// region [Constants]
export const DOT_MATRIX_PRESETS: DotMatrixPreset[] = [
  {
    id: "board",
    name: "Exchange Board",
    description:
      "간격 2px 의 앰버 전광판. 밝은 줄이 가끔 위에서 아래로 훑고 지나감. 꺼진 도트가 박스를 채워 헤더에서 '판' 으로 보이는 게 장점이자 단점.",
    mode: "scan",
    pitchInCssPx: 2,
    dotDiameterRatio: 0.78,
    coverageThreshold: 0.42,
    litColor: "#F7931A",
    unlitColor: "#2A1906",
    glowColor: null,
    scanColor: "#FFE0B8",
    stepInMs: 55,
    tickerGapRatio: 0,
  },
  {
    id: "ticker",
    name: "Ticker Marquee",
    description:
      "로고가 오른쪽에서 왼쪽으로 한 칸씩 흘러가는 마키. 시세 티커 문법 그대로라 맥락은 가장 강하지만, 로고가 늘 반쯤 잘려 있어 헤더용으로는 부적합.",
    mode: "ticker",
    pitchInCssPx: 2,
    dotDiameterRatio: 0.78,
    coverageThreshold: 0.42,
    litColor: "#FFB347",
    unlitColor: "#2A1906",
    glowColor: null,
    scanColor: "#FFFFFF",
    stepInMs: 60,
    tickerGapRatio: 0.35,
  },
  {
    id: "glow",
    name: "LED Glow",
    description:
      "간격 3px 큰 도트에 번짐을 넣은 버전. 사진으로 찍은 실제 LED 판 느낌. 정지 시안이라 OG 이미지·공유 카드용.",
    mode: "static",
    pitchInCssPx: 3,
    dotDiameterRatio: 0.72,
    coverageThreshold: 0.38,
    litColor: "#FFC266",
    unlitColor: "#24170A",
    glowColor: "rgba(247, 147, 26, 0.55)",
    scanColor: "#FFFFFF",
    stepInMs: 0,
    tickerGapRatio: 0,
  },
];
// endregion

// region [Privates]
export function formatDotMatrixPresetSpec(preset: DotMatrixPreset): string {
  return [
    preset.mode,
    `간격 ${preset.pitchInCssPx}px`,
    `도트 ${Math.round(preset.dotDiameterRatio * 100)}%`,
    preset.glowColor === null ? "번짐 없음" : "번짐",
    preset.mode === "static" ? "정지" : `스텝 ${preset.stepInMs}ms`,
  ].join(" · ");
}
// endregion
