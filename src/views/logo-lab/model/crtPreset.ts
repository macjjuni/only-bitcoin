import { GLITCH_PRESETS, type LogoEffectPresetBase } from "@/shared/lib/wordmark-canvas";

/**
 * CRT 형광 시안 프리셋.
 *
 * 브라운관 형광체 질감. 스캔라인 + 번짐(bloom) + 아주 약한 깜빡임 + 천천히 내려가는 밝은 띠.
 * 아이콘·워드마크가 같은 형광색·같은 띠 주기를 써서 한 화면처럼 보임.
 */

// region [Types]
/** CRT 위에 얹는 글리치 버스트. 신호가 튀는 브라운관 연출. */
export interface CrtGlitch {
  /** 버스트 한 번이 들어가는 구간 길이(ms). 구간 안 어디서 튈지는 사이클마다 바뀜. */
  intervalInMs: number;
  burstInMs: number;
  channelOffsetInCssPx: number;
  maxBandShiftInCssPx: number;
  maxBandCount: number;
}

export interface CrtPreset extends LogoEffectPresetBase {
  phosphorColor: string;
  /** 번짐 반경(CSS px). 축소·확대로 흐리므로 대략값. */
  bloomRadiusInCssPx: number;
  bloomAlpha: number;
  scanlinePeriodInCssPx: number;
  /** 스캔라인이 깎는 진하기(0~1). */
  scanlineDarkness: number;
  /** 프레임마다 밝기가 흔들리는 폭(0~1). */
  flickerAmount: number;
  /** 밝은 띠가 위에서 아래로 한 번 지나가는 주기(ms). 0 이면 띠 없음. */
  rollPeriodInMs: number;
  rollBandAlpha: number;
  /** null 이면 글리치 없음. */
  glitch: CrtGlitch | null;
}
// endregion

// region [Constants]
const WHISPER_GLITCH_PRESET = GLITCH_PRESETS[0];

/**
 * 헤더 Whisper 글리치와 같은 강도. 채널 분리·띠 변위·띠 개수는 Whisper 값을 그대로 씀.
 * 대기 6~9초 → 9초 구간 안 랜덤 위치, 2프레임 → 50ms 프레임 2장 = 100ms 로 옮겼음.
 */
const WHISPER_CRT_GLITCH: CrtGlitch = {
  intervalInMs: WHISPER_GLITCH_PRESET.idleDurationRangeInMs[1],
  burstInMs: WHISPER_GLITCH_PRESET.burstFrameCount * 50,
  channelOffsetInCssPx: WHISPER_GLITCH_PRESET.maxChannelOffsetInCssPx,
  maxBandShiftInCssPx: WHISPER_GLITCH_PRESET.maxSliceOffsetInCssPx,
  maxBandCount: WHISPER_GLITCH_PRESET.sliceBandCountRange[1],
};

const HOT_ORANGE_BASE = {
  phosphorColor: "#F7931A",
  bloomRadiusInCssPx: 5,
  bloomAlpha: 0.75,
  scanlinePeriodInCssPx: 3,
  scanlineDarkness: 0.5,
  flickerAmount: 0.12,
  rollPeriodInMs: 3200,
  rollBandAlpha: 0.45,
};

export const CRT_PRESETS: CrtPreset[] = [
  {
    id: "amber",
    name: "Amber P3",
    description:
      "80년대 터미널 앰버 형광. 브랜드 오렌지와 계열이 같아 가장 자연스럽게 붙음. 번짐·깜빡임은 최소로 둬서 상주 자리 후보. Whisper 글리치 포함.",
    phosphorColor: "#FFB000",
    bloomRadiusInCssPx: 3,
    bloomAlpha: 0.45,
    scanlinePeriodInCssPx: 2,
    scanlineDarkness: 0.35,
    flickerAmount: 0.06,
    rollPeriodInMs: 5200,
    rollBandAlpha: 0.3,
    glitch: WHISPER_CRT_GLITCH,
  },
  {
    id: "green",
    name: "Green P1",
    description:
      "녹색 형광 모니터. 해커 영화 클리셰라 사이퍼펑크가 바로 읽히지만 비트코인 오렌지와는 충돌함. 톤 비교용 대조군. Whisper 글리치 포함.",
    phosphorColor: "#39FF7A",
    bloomRadiusInCssPx: 3.5,
    bloomAlpha: 0.55,
    scanlinePeriodInCssPx: 2,
    scanlineDarkness: 0.4,
    flickerAmount: 0.08,
    rollPeriodInMs: 4200,
    rollBandAlpha: 0.35,
    glitch: WHISPER_CRT_GLITCH,
  },
  {
    id: "orange-hot",
    name: "Hot Orange",
    description:
      "브랜드 오렌지 그대로 + 굵은 스캔라인·강한 번짐. 형광체가 과열된 느낌. 대형에서 진가가 남. Whisper 글리치 포함.",
    ...HOT_ORANGE_BASE,
    glitch: WHISPER_CRT_GLITCH,
  },
  {
    id: "orange-hot-glitch",
    name: "Hot Orange Glitch",
    description:
      "Hot Orange 에 강한 신호 튐을 얹음. 2.4초 구간마다 한 번, 0.3초 동안 채널 분리 + 가로 띠 1~3개가 밀림. 형광 번짐까지 같이 밀려서 브라운관이 실제로 튀는 느낌.",
    ...HOT_ORANGE_BASE,
    glitch: {
      intervalInMs: 2400,
      burstInMs: 300,
      channelOffsetInCssPx: 2.5,
      maxBandShiftInCssPx: 6,
      maxBandCount: 3,
    },
  },
];
// endregion

// region [Privates]
export function formatCrtPresetSpec(preset: CrtPreset): string {
  return [
    preset.phosphorColor,
    `스캔라인 ${preset.scanlinePeriodInCssPx}px`,
    `번짐 ${preset.bloomRadiusInCssPx}px`,
    `깜빡임 ${Math.round(preset.flickerAmount * 100)}%`,
    preset.rollPeriodInMs > 0 ? `띠 ${(preset.rollPeriodInMs / 1000).toFixed(1)}s` : "띠 없음",
    preset.glitch === null
      ? "글리치 없음"
      : `글리치 ${(preset.glitch.intervalInMs / 1000).toFixed(1)}s마다`,
  ].join(" · ");
}
// endregion
