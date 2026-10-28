/**
 * 해시 스트림 시안 프리셋.
 *
 * 워드마크 글리프 **안쪽에서만** 16진수·base58 문자가 아래로 흐르는 스타일임.
 * 글리치가 "망가짐" 을 연출하면 이쪽은 "데이터가 지나감" 을 연출함.
 */
export interface HashStreamPreset {
  id: string;
  name: string;
  description: string;
  /** 흐르는 문자 하나가 차지하는 칸 크기(CSS px). 폰트 크기는 칸 높이에서 역산함. */
  cellWidthInCssPx: number;
  cellHeightInCssPx: number;
  /** 열마다 다른 속도를 뽑을 범위(CSS px/초). 열마다 달라야 "흐른다" 는 인상이 남. */
  columnSpeedRangeInCssPxPerSec: [number, number];
  /** 흐르는 문자 기본 색. */
  streamColor: string;
  /** 간헐적으로 튀는 강조 문자 색. */
  highlightColor: string;
  /** 문자 하나가 강조색으로 찍힐 확률(0~1). */
  highlightRatio: number;
  /**
   * 글리프 본체를 얼마나 남길지(0~1).
   *
   * 0 이면 글자가 흐르는 문자로만 이루어져 작은 크기에서 판독이 어려움.
   * 0.2~0.3 쯤 깔아 두면 워드마크 형태가 유지된 채로 문자가 흐르는 것처럼 보임.
   */
  bodyGhostAlpha: number;
  /** 흐르게 할 문자 집합. */
  characterSet: string;
}

const HEX_CHARACTER_SET = "0123456789abcdef";
/** base58 — 비트코인 주소에서 헷갈리는 0 O I l 을 뺀 집합. */
const BASE58_CHARACTER_SET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BINARY_CHARACTER_SET = "01";

export const HASH_STREAM_PRESETS: HashStreamPreset[] = [
  {
    id: "sha256",
    name: "SHA-256",
    description:
      "16진수가 글자 안쪽으로 흐름. 블록 해시를 그대로 옮긴 모양이라 비트코인 맥락에 가장 직접적으로 붙음.",
    cellWidthInCssPx: 7,
    cellHeightInCssPx: 9,
    columnSpeedRangeInCssPxPerSec: [14, 40],
    streamColor: "#F7931A",
    highlightColor: "#FFD8A8",
    highlightRatio: 0.07,
    bodyGhostAlpha: 0.22,
    characterSet: HEX_CHARACTER_SET,
  },
  {
    id: "base58",
    name: "Base58",
    description:
      "주소 인코딩에 쓰는 base58 문자가 흐름. 대소문자가 섞여 리듬이 불규칙하고 16진수보다 '사람이 읽는 키' 느낌이 남.",
    cellWidthInCssPx: 8,
    cellHeightInCssPx: 10,
    columnSpeedRangeInCssPxPerSec: [10, 30],
    streamColor: "#F7931A",
    highlightColor: "#FFFFFF",
    highlightRatio: 0.05,
    bodyGhostAlpha: 0.26,
    characterSet: BASE58_CHARACTER_SET,
  },
  {
    id: "binary",
    name: "Binary",
    description:
      "0 과 1 만 흐름. 문자 종류가 둘뿐이라 가장 조용하고, 32px 헤더에서도 글자 형태가 안 무너지는 유일한 해시 시안.",
    cellWidthInCssPx: 4,
    cellHeightInCssPx: 5,
    columnSpeedRangeInCssPxPerSec: [18, 46],
    streamColor: "#F7931A",
    highlightColor: "#FFE9CC",
    highlightRatio: 0.09,
    bodyGhostAlpha: 0.3,
    characterSet: BINARY_CHARACTER_SET,
  },
];

/** 프리셋의 수치를 한 줄 사양 문자열로 만듦. */
export function formatHashStreamPresetSpec(preset: HashStreamPreset): string {
  const [minSpeedInCssPxPerSec, maxSpeedInCssPxPerSec] = preset.columnSpeedRangeInCssPxPerSec;

  return [
    `칸 ${preset.cellWidthInCssPx}×${preset.cellHeightInCssPx}px`,
    `속도 ${minSpeedInCssPxPerSec}~${maxSpeedInCssPxPerSec}px/s`,
    `본체 ${Math.round(preset.bodyGhostAlpha * 100)}%`,
    `문자 ${preset.characterSet.length}종`,
  ].join(" · ");
}
