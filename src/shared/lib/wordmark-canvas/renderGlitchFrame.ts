import type { BakedWordmark } from "./bakeWordmarkCanvas";
import type { GlitchPreset } from "./glitchPreset";

/**
 * 구워 둔 워드마크 텍스처를 글리치 합성해 한 프레임 그리는 모듈.
 *
 * 여기서는 `drawImage` 와 합성 모드만 쓴다. `getImageData` / `putImageData` 는
 * 픽셀 배열을 CPU 로 왕복시켜 작은 로고에서도 프레임을 무너뜨리므로 쓰지 않는다.
 */

// region [Constants]
/**
 * 스캔라인 주기와 두께(CSS px).
 *
 * 디바이스 px 로 고정하면 안 된다. DPR 3 기기에서 3디바이스px 주기는 1CSS px 가 되어
 * 스캔라인이 보이지 않고 모아레만 생긴다. CSS px 로 정의하고 `pixelRatio` 를 곱해야
 * 어느 화면에서나 같은 굵기로 보인다.
 */
const SCANLINE_PERIOD_IN_CSS_PX = 2;
const SCANLINE_THICKNESS_IN_CSS_PX = 1;

/** 비트 노이즈 블록 한 변의 길이 범위(CSS px). */
const MIN_NOISE_BLOCK_SIZE_IN_CSS_PX = 1;
const MAX_NOISE_BLOCK_SIZE_IN_CSS_PX = 6;

// endregion

// region [Types]
/** 좌우로 어긋나는 가로 띠 하나. 좌표는 모두 디바이스 px. */
interface SliceBand {
  topInDevicePx: number;
  heightInDevicePx: number;
  offsetXInDevicePx: number;
}

/** 비트 노이즈 블록 하나. 좌표는 모두 디바이스 px. */
interface NoiseBlock {
  leftInDevicePx: number;
  topInDevicePx: number;
  widthInDevicePx: number;
  heightInDevicePx: number;
  alpha: number;
}

/** 한 프레임의 난수 파라미터. 버스트의 프레임마다 새로 뽑는다. */
export interface GlitchFrameParams {
  channelOffsetInDevicePx: number;
  sliceBands: SliceBand[];
  noiseBlocks: NoiseBlock[];
  scanlineAlpha: number;
  scanlinePeriodInDevicePx: number;
  scanlineThicknessInDevicePx: number;
}

// endregion

// region [Privates]
/** min 이상 max 이하의 정수를 반환한다. */
function pickRandomIntegerBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 절댓값이 maxMagnitude 이하인 0이 아닌 정수를 반환한다. */
function pickRandomSignedOffset(maxMagnitude: number): number {
  const magnitude = pickRandomIntegerBetween(1, Math.max(1, Math.round(maxMagnitude)));
  return Math.random() < 0.5 ? -magnitude : magnitude;
}

// endregion

// region [Params]
/**
 * 글리치가 꺼진 "정지 상태" 파라미터.
 *
 * 버스트가 끝나면 이 상태로 되돌려 깔끔한 워드마크만 남긴다. 스캔라인은 프리셋이
 * 요구하면 정지 상태에서도 유지한다 — Terminal 프리셋의 CRT 질감이 그래야 살아 있다.
 */
export function createRestFrameParams(
  preset: GlitchPreset,
  bakedWordmark: BakedWordmark,
): GlitchFrameParams {
  return {
    channelOffsetInDevicePx: 0,
    sliceBands: [],
    noiseBlocks: [],
    scanlineAlpha: preset.scanlineAlpha,
    scanlinePeriodInDevicePx: Math.max(
      2,
      Math.round(SCANLINE_PERIOD_IN_CSS_PX * bakedWordmark.pixelRatio),
    ),
    scanlineThicknessInDevicePx: Math.max(
      1,
      Math.round(SCANLINE_THICKNESS_IN_CSS_PX * bakedWordmark.pixelRatio),
    ),
  };
}

/** 프리셋 범위 안에서 한 프레임짜리 난수 파라미터를 뽑는다. */
export function createRandomFrameParams(
  preset: GlitchPreset,
  bakedWordmark: BakedWordmark,
): GlitchFrameParams {
  const { pixelRatio, widthInDevicePx, heightInDevicePx } = bakedWordmark;
  const [minBandCount, maxBandCount] = preset.sliceBandCountRange;

  const sliceBands: SliceBand[] = Array.from(
    { length: pickRandomIntegerBetween(minBandCount, maxBandCount) },
    () => {
      const bandHeightInDevicePx = pickRandomIntegerBetween(
        Math.max(2, Math.round(heightInDevicePx * 0.04)),
        Math.max(3, Math.round(heightInDevicePx * 0.18)),
      );

      return {
        topInDevicePx: pickRandomIntegerBetween(0, heightInDevicePx - bandHeightInDevicePx),
        heightInDevicePx: bandHeightInDevicePx,
        offsetXInDevicePx: pickRandomSignedOffset(preset.maxSliceOffsetInCssPx * pixelRatio),
      };
    },
  );

  const minBlockSizeInDevicePx = Math.max(
    1,
    Math.round(MIN_NOISE_BLOCK_SIZE_IN_CSS_PX * pixelRatio),
  );
  const maxBlockSizeInDevicePx = Math.round(MAX_NOISE_BLOCK_SIZE_IN_CSS_PX * pixelRatio);

  const noiseBlocks: NoiseBlock[] = Array.from({ length: preset.noiseBlockCount }, () => {
    return {
      leftInDevicePx: pickRandomIntegerBetween(0, widthInDevicePx),
      topInDevicePx: pickRandomIntegerBetween(0, heightInDevicePx),
      widthInDevicePx: pickRandomIntegerBetween(minBlockSizeInDevicePx, maxBlockSizeInDevicePx),
      heightInDevicePx: pickRandomIntegerBetween(minBlockSizeInDevicePx, maxBlockSizeInDevicePx),
      alpha: 0.35 + Math.random() * 0.45,
    };
  });

  return {
    ...createRestFrameParams(preset, bakedWordmark),
    channelOffsetInDevicePx: pickRandomSignedOffset(preset.maxChannelOffsetInCssPx * pixelRatio),
    sliceBands,
    noiseBlocks,
  };
}

// endregion

// region [Privates]
/**
 * 채널 분리까지 합성한 중간 결과를 스크래치 캔버스에 그린다.
 *
 * 시안·마젠타 실루엣을 반대 방향으로 밀어 `lighter`( 가산 )로 올리고, 그 위에 본체를
 * 불투명하게 덮는다. 그래서 글자 속은 브랜드 오렌지 그대로 남고 윤곽 바깥으로만
 * 시안·마젠타 테두리가 삐져나온다.
 */
function drawChannelSplitToScratch(
  scratchContext: CanvasRenderingContext2D,
  bakedWordmark: BakedWordmark,
  channelOffsetInDevicePx: number,
): void {
  const { baseCanvas, cyanCanvas, magentaCanvas, widthInDevicePx, heightInDevicePx } =
    bakedWordmark;

  scratchContext.globalCompositeOperation = "source-over";
  scratchContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);

  if (channelOffsetInDevicePx !== 0) {
    scratchContext.drawImage(cyanCanvas, -channelOffsetInDevicePx, 0);
    scratchContext.globalCompositeOperation = "lighter";
    scratchContext.drawImage(magentaCanvas, channelOffsetInDevicePx, 0);
    scratchContext.globalCompositeOperation = "source-over";
  }

  scratchContext.drawImage(baseCanvas, 0, 0);
}

/**
 * 스크래치의 내용을 가로 띠 단위로 어긋나게 옮겨 그린다.
 *
 * 먼저 전체를 제자리에 그린 뒤, 띠 영역만 지우고 그 띠를 x 로 밀어 다시 그린다.
 * 띠를 밀면 원래 자리가 비는 것이 정상이다 — 그 빈 틈이 글리치로 읽힌다.
 */
function drawDisplacedSlices(
  targetContext: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  sliceBands: SliceBand[],
  widthInDevicePx: number,
  heightInDevicePx: number,
): void {
  targetContext.globalCompositeOperation = "source-over";
  targetContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
  targetContext.drawImage(scratchCanvas, 0, 0);

  for (const band of sliceBands) {
    targetContext.clearRect(0, band.topInDevicePx, widthInDevicePx, band.heightInDevicePx);
    targetContext.drawImage(
      scratchCanvas,
      0,
      band.topInDevicePx,
      widthInDevicePx,
      band.heightInDevicePx,
      band.offsetXInDevicePx,
      band.topInDevicePx,
      widthInDevicePx,
      band.heightInDevicePx,
    );
  }
}

/**
 * 스캔라인과 비트 노이즈를 글리프 위에만 얹는다.
 *
 * `source-atop` 이 핵심이다. 캔버스 배경은 투명이라 `source-over` 로 그리면 줄과 블록이
 * 글자 밖 빈 공간에도 찍혀 페이지 배경 위에 떠 보인다. `source-atop` 은 이미 불투명한
 * 픽셀이 있는 곳에만 그려서 글리프 안쪽만 변조한다.
 */
function drawOverlayEffects(
  targetContext: CanvasRenderingContext2D,
  params: GlitchFrameParams,
  widthInDevicePx: number,
  heightInDevicePx: number,
): void {
  targetContext.globalCompositeOperation = "source-atop";

  if (params.scanlineAlpha > 0) {
    targetContext.fillStyle = `rgba(0,0,0,${params.scanlineAlpha})`;

    for (let y = 0; y < heightInDevicePx; y += params.scanlinePeriodInDevicePx) {
      targetContext.fillRect(0, y, widthInDevicePx, params.scanlineThicknessInDevicePx);
    }
  }

  for (const block of params.noiseBlocks) {
    targetContext.fillStyle = `rgba(255,255,255,${block.alpha})`;
    targetContext.fillRect(
      block.leftInDevicePx,
      block.topInDevicePx,
      block.widthInDevicePx,
      block.heightInDevicePx,
    );
  }

  targetContext.globalCompositeOperation = "source-over";
}
// endregion

// region [Renderer]
/**
 * 글리치 한 프레임을 대상 캔버스에 그린다.
 *
 * `scratchCanvas` 는 호출자가 컴포넌트 수명 동안 재사용해야 한다. 프레임마다
 * `createElement("canvas")` 를 하면 GC 압력으로 버스트 중에 프레임이 튄다.
 */
export function renderGlitchFrame(
  targetContext: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  bakedWordmark: BakedWordmark,
  params: GlitchFrameParams,
): void {
  const { widthInDevicePx, heightInDevicePx } = bakedWordmark;
  const scratchContext = scratchCanvas.getContext("2d");

  if (scratchContext === null) {
    return;
  }

  drawChannelSplitToScratch(scratchContext, bakedWordmark, params.channelOffsetInDevicePx);
  drawDisplacedSlices(
    targetContext,
    scratchCanvas,
    params.sliceBands,
    widthInDevicePx,
    heightInDevicePx,
  );
  drawOverlayEffects(targetContext, params, widthInDevicePx, heightInDevicePx);
}
// endregion
