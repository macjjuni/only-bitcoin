/**
 * 글리치 워드마크 프리셋 정의.
 *
 * 글리치는 "상시 애니메이션" 이 아니라 **대기 -> 짧은 버스트 -> 대기** 구조다.
 * 로고는 화면에 항상 떠 있는 요소라 매 프레임 `requestAnimationFrame` 을 돌리면
 * 모바일에서 배터리만 깎아먹는다. 그래서 프리셋은 "얼마나 자주 튀는지"
 * ( `idleDurationRangeInMs` )와 "한 번에 몇 프레임 튀는지"( `burstFrameCount` )를 나눠 갖는다.
 */
export interface GlitchPreset {
  id: string;
  name: string;
  description: string;
  /** 시안·마젠타 채널이 본체에서 좌우로 어긋나는 최대 거리(CSS px). */
  maxChannelOffsetInCssPx: number;
  /** 한 프레임에 좌우로 어긋나는 가로 띠 개수의 범위. */
  sliceBandCountRange: [number, number];
  /** 가로 띠가 어긋나는 최대 거리(CSS px). */
  maxSliceOffsetInCssPx: number;
  /** 글리치 한 번에 소비하는 프레임 수. 2~3 이면 "툭" 튀고, 6 이상이면 "지글거린다". */
  burstFrameCount: number;
  /** 버스트 사이 정지 구간의 길이 범위(ms). 이 안에서 매번 랜덤으로 뽑는다. */
  idleDurationRangeInMs: [number, number];
  /** 글리프 위에 얹는 스캔라인 농도(0~1). 0 이면 스캔라인 없음. */
  scanlineAlpha: number;
  /** 글리프 내부에서 깜빡이는 비트 노이즈 블록 개수. */
  noiseBlockCount: number;
}

/** 채널 분리에 쓰는 시안 색. 오렌지 본체의 보색 쪽이라 분리가 가장 잘 읽힌다. */
export const CHANNEL_CYAN_COLOR = "#00F0FF";

/** 채널 분리에 쓰는 마젠타 색. */
export const CHANNEL_MAGENTA_COLOR = "#FF0066";

/**
 * 프리셋 4종.
 *
 * 값 간격을 일부러 넓게 벌렸다. 채널 분리를 1 / 3 / 3 / 6px 로 둔 것은 2배씩 차이를 줘야
 * 32px 짜리 헤더 로고에서도 눈으로 구분이 되기 때문이다. 1px 씩 올리면 사실상 같은 시안이다.
 */
export const GLITCH_PRESETS: GlitchPreset[] = [
  {
    id: "whisper",
    name: "Whisper",
    description:
      "6~9초마다 2프레임만 툭 튄다. 채널 분리 1px 이라 '뭔가 지나갔나' 싶은 정도. 헤더처럼 모든 페이지에 상주하는 자리를 위한 최소 강도.",
    maxChannelOffsetInCssPx: 1,
    sliceBandCountRange: [1, 2],
    maxSliceOffsetInCssPx: 2,
    burstFrameCount: 2,
    idleDurationRangeInMs: [6000, 9000],
    scanlineAlpha: 0,
    noiseBlockCount: 0,
  },
  {
    id: "standard",
    name: "Standard",
    description:
      "채널 분리 3px, 가로 띠 2~3개. 3~6초마다 3프레임. 로고라고 알아볼 수 있으면서 글리치도 분명히 보이는 지점.",
    maxChannelOffsetInCssPx: 3,
    sliceBandCountRange: [2, 3],
    maxSliceOffsetInCssPx: 6,
    burstFrameCount: 3,
    idleDurationRangeInMs: [3000, 6000],
    scanlineAlpha: 0,
    noiseBlockCount: 2,
  },
  {
    id: "terminal",
    name: "Terminal",
    description:
      "Standard 와 같은 강도에 스캔라인 35% 를 상시로 깐다. 정지 상태에서도 CRT 질감이 남는 유일한 시안.",
    maxChannelOffsetInCssPx: 3,
    sliceBandCountRange: [2, 3],
    maxSliceOffsetInCssPx: 5,
    burstFrameCount: 3,
    idleDurationRangeInMs: [3500, 6000],
    scanlineAlpha: 0.35,
    noiseBlockCount: 3,
  },
  {
    id: "breach",
    name: "Breach",
    description:
      "채널 분리 6px, 가로 띠 4~5개가 ±14px 로 어긋나고 비트 노이즈 8개. 2.5초마다 5프레임. 글자가 찢어지는 수준이라 공유 카드·랜딩 전용.",
    maxChannelOffsetInCssPx: 6,
    sliceBandCountRange: [4, 5],
    maxSliceOffsetInCssPx: 14,
    burstFrameCount: 5,
    idleDurationRangeInMs: [2500, 4500],
    scanlineAlpha: 0.2,
    noiseBlockCount: 8,
  },
];

/**
 * 프리셋의 수치를 한 줄 사양 문자열로 만든다.
 *
 * 시안 비교에서 이 줄이 생각보다 큰 역할을 한다. 글리치는 순간적으로만 나타나므로
 * 눈으로 본 인상과 실제 수치를 바로 맞춰볼 수 있어야 판단이 선다.
 */
export function formatGlitchPresetSpec(preset: GlitchPreset): string {
  const [minBandCount, maxBandCount] = preset.sliceBandCountRange;
  const scanlineText =
    preset.scanlineAlpha > 0
      ? `스캔라인 ${Math.round(preset.scanlineAlpha * 100)}%`
      : "스캔라인 없음";

  return [
    `채널 ±${preset.maxChannelOffsetInCssPx}px`,
    `띠 ${minBandCount}~${maxBandCount}개 / 변위 ±${preset.maxSliceOffsetInCssPx}px`,
    scanlineText,
    `노이즈 ${preset.noiseBlockCount}개`,
  ].join(" · ");
}
