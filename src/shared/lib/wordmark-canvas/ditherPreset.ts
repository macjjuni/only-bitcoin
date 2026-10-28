import type { LogoEffectPresetBase } from "./logoEffect";

/**
 * 1-bit 디더 시안 프리셋.
 *
 * 글자 안 명암을 베이어 행렬로 1비트 점묘함. 90년대 사이퍼펑크 진(zine)·팩스·감열지 질감.
 * 셀을 키우면 레트로, 줄이면 인쇄 망점에 가까워짐.
 */

// region [Types]
/**
 * - `static`: 위가 밝고 아래가 어두운 고정 그라데이션. 정지 시안.
 * - `sweep`: 밝은 띠가 왼쪽에서 오른쪽으로 지나감. 금속 광택.
 * - `orbit`: 광원이 로고 둘레를 돎. 점묘 패턴이 계속 바뀜.
 */
export type DitherLight = "static" | "sweep" | "orbit";

export interface DitherPreset extends LogoEffectPresetBase {
  light: DitherLight;
  /** 디더 한 점 크기(CSS px). */
  cellSizeInCssPx: number;
  /** 베이어 행렬 크기. 클수록 계조가 부드러움. */
  matrixSize: 2 | 4 | 8;
  coverageThreshold: number;
  onColor: string;
  /** 꺼진 점 색. null 이면 투명이라 글자 윤곽이 점으로만 남음. */
  offColor: string | null;
  cycleInMs: number;
  /** 프레임 간격(ms). 생략하면 엔진 기본값( 약 15fps ). 배경처럼 큰 자리는 더 느리게 둠. */
  frameIntervalInMs?: number;
}
// endregion

// region [Constants]
export const DITHER_PRESETS: DitherPreset[] = [
  {
    id: "zine",
    name: "Zine Print",
    description:
      "위에서 아래로 어두워지는 고정 그라데이션을 4×4 베이어로 찍음. 복사기로 여러 번 뜬 진 표지 느낌. 정지 시안이라 OG 이미지·인쇄물 후보.",
    light: "static",
    cellSizeInCssPx: 1.5,
    matrixSize: 4,
    coverageThreshold: 0.5,
    onColor: "#F7931A",
    offColor: "#3A2206",
    cycleInMs: 0,
  },
  {
    id: "sweep",
    name: "Chrome Sweep",
    description:
      "밝은 띠가 3초 간격으로 지나가는 금속 광택을 8×8 베이어로 점묘함. 셀 1px 이라 헤더에서도 글자가 거의 안 깨짐. 광택이 지나갈 때만 디더가 드러남.",
    light: "sweep",
    cellSizeInCssPx: 1,
    matrixSize: 8,
    coverageThreshold: 0.5,
    onColor: "#FFD199",
    offColor: "#B5650E",
    cycleInMs: 3200,
  },
  {
    id: "orbit",
    name: "Orbit Light",
    description:
      "광원이 로고 둘레를 도는 흰색 2px 디더. 꺼진 점이 투명이라 어두운 쪽 글자가 점으로만 남아 가장 '1비트' 다움. 대형 전용.",
    light: "orbit",
    cellSizeInCssPx: 2,
    matrixSize: 4,
    coverageThreshold: 0.45,
    onColor: "#FFFFFF",
    offColor: null,
    cycleInMs: 6000,
  },
];
// endregion

// region [Privates]
export function formatDitherPresetSpec(preset: DitherPreset): string {
  return [
    preset.light,
    `점 ${preset.cellSizeInCssPx}px`,
    `베이어 ${preset.matrixSize}×${preset.matrixSize}`,
    preset.offColor === null ? "배경 투명" : "2색",
    preset.light === "static" ? "정지" : `주기 ${(preset.cycleInMs / 1000).toFixed(1)}s`,
  ].join(" · ");
}
// endregion
