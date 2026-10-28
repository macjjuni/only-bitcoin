import {
  createTimelineController,
  createTintedCanvas,
  hashToUnit,
  type LogoEffectFactory,
  resolveContentBox,
} from "@/shared/lib/wordmark-canvas";
import type { CrtPreset } from "../model/crtPreset";

/**
 * CRT 형광 재생 엔진.
 *
 * 번짐·스캔라인 입힌 본체·밝은 띠용 텍스처를 생성 시 한 번씩 구워 둠.
 * 글리치가 있는 프리셋은 CRT 한 장 위에 채널 분리·가로 띠 변위를 버스트로 얹음.
 * 프레임에선 알파만 바꿔 `drawImage` 서너 번으로 끝냄.
 */

// region [Constants]
const FRAME_INTERVAL_IN_MS = 50;
/** 밝은 띠 높이( 캔버스 높이 대비 ). */
const ROLL_BAND_HEIGHT_RATIO = 0.35;
/** 첫 사이클 글리치 시작 시각(ms). 클릭으로 처음부터 돌릴 때 바로 보이게 짧게 둠. */
const FIRST_BURST_DELAY_IN_MS = 300;
// endregion

// region [Privates]
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 축소했다 키우는 식으로 흐림. `ctx.filter` 는 구형 사파리에서 안 먹어서 안 씀.
 * 두 번 거치면 계단이 거의 안 보임.
 */
function createBloomCanvas(
  sourceCanvas: HTMLCanvasElement,
  radiusInDevicePx: number,
): HTMLCanvasElement {
  const { width, height } = sourceCanvas;
  const downscale = Math.max(1, radiusInDevicePx);
  const smallCanvas = createCanvas(
    Math.max(1, Math.round(width / downscale)),
    Math.max(1, Math.round(height / downscale)),
  );
  const smallContext = smallCanvas.getContext("2d");
  const bloomCanvas = createCanvas(width, height);
  const bloomContext = bloomCanvas.getContext("2d");

  if (smallContext === null || bloomContext === null) {
    return bloomCanvas;
  }

  smallContext.imageSmoothingEnabled = true;
  smallContext.drawImage(sourceCanvas, 0, 0, smallCanvas.width, smallCanvas.height);
  bloomContext.imageSmoothingEnabled = true;
  bloomContext.drawImage(smallCanvas, 0, 0, width, height);
  // 한 번 더 축소·확대해서 계단을 뭉갬.
  smallContext.clearRect(0, 0, smallCanvas.width, smallCanvas.height);
  smallContext.drawImage(bloomCanvas, 0, 0, smallCanvas.width, smallCanvas.height);
  bloomContext.clearRect(0, 0, width, height);
  bloomContext.drawImage(smallCanvas, 0, 0, width, height);

  return bloomCanvas;
}

/** 본체에 스캔라인을 깎아 넣은 사본. */
function createScannedCanvas(
  sourceCanvas: HTMLCanvasElement,
  periodInDevicePx: number,
  darkness: number,
): HTMLCanvasElement {
  const { width, height } = sourceCanvas;
  const scannedCanvas = createCanvas(width, height);
  const scannedContext = scannedCanvas.getContext("2d");

  if (scannedContext === null) {
    return scannedCanvas;
  }

  scannedContext.drawImage(sourceCanvas, 0, 0);
  scannedContext.globalCompositeOperation = "destination-out";
  scannedContext.fillStyle = `rgba(0, 0, 0, ${darkness})`;

  const thickness = Math.max(1, periodInDevicePx / 2);
  for (let y = 0; y < height; y += periodInDevicePx) {
    scannedContext.fillRect(0, y, width, thickness);
  }

  return scannedCanvas;
}
// endregion

// region [Factory]
export const createCrtEffect: LogoEffectFactory<CrtPreset> = ({ canvas, bakedSource, preset }) => {
  const { widthInDevicePx, heightInDevicePx, pixelRatio, baseCanvas } = bakedSource;

  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("CRT 캔버스 컨텍스트를 만들지 못했음.");
  }

  const phosphorCanvas = createTintedCanvas(baseCanvas, preset.phosphorColor);
  const bloomCanvas = createBloomCanvas(phosphorCanvas, preset.bloomRadiusInCssPx * pixelRatio);
  const scannedCanvas = createScannedCanvas(
    phosphorCanvas,
    Math.max(2, Math.round(preset.scanlinePeriodInCssPx * pixelRatio)),
    preset.scanlineDarkness,
  );
  // 띠가 지나갈 때 형광이 하얗게 달아오르는 부분.
  const hotCanvas = createTintedCanvas(baseCanvas, "#FFFFFF");
  const rollBandHeight = Math.round(heightInDevicePx * ROLL_BAND_HEIGHT_RATIO);
  const contentBox = resolveContentBox(bakedSource);

  // CRT 한 장을 여기 그린 뒤 글리치 변위를 얹어 대상 캔버스로 옮김.
  const frameCanvas = createCanvas(widthInDevicePx, heightInDevicePx);
  const frameContext = frameCanvas.getContext("2d");

  /** CRT 한 장을 `frameCanvas` 에 그림. */
  function drawCrtFrame(brightness: number, rollBandTop: number | null): void {
    if (frameContext === null) {
      return;
    }

    frameContext.globalCompositeOperation = "source-over";
    frameContext.globalAlpha = 1;
    frameContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);

    frameContext.globalCompositeOperation = "lighter";
    frameContext.globalAlpha = preset.bloomAlpha * brightness;
    frameContext.drawImage(bloomCanvas, 0, 0);

    frameContext.globalCompositeOperation = "source-over";
    frameContext.globalAlpha = brightness;
    frameContext.drawImage(scannedCanvas, 0, 0);

    if (rollBandTop !== null) {
      const top = Math.max(0, rollBandTop);
      const bottom = Math.min(heightInDevicePx, rollBandTop + rollBandHeight);

      if (bottom > top) {
        frameContext.globalCompositeOperation = "lighter";
        frameContext.globalAlpha = preset.rollBandAlpha;
        frameContext.drawImage(
          hotCanvas,
          0,
          top,
          widthInDevicePx,
          bottom - top,
          0,
          top,
          widthInDevicePx,
          bottom - top,
        );
      }
    }

    frameContext.globalCompositeOperation = "source-over";
    frameContext.globalAlpha = 1;
  }

  /** 지금 시각이 글리치 버스트 안인지. 첫 사이클은 빨리 튀게 해서 클릭하면 바로 보임. */
  function isGlitchBurstAt(timeInMs: number): boolean {
    const { glitch } = preset;

    if (glitch === null) {
      return false;
    }

    const cycleIndex = Math.floor(timeInMs / glitch.intervalInMs);
    const timeInCycle = timeInMs - cycleIndex * glitch.intervalInMs;
    const burstStart =
      cycleIndex === 0
        ? FIRST_BURST_DELAY_IN_MS
        : hashToUnit(cycleIndex * 9.17) * (glitch.intervalInMs - glitch.burstInMs);

    return timeInCycle >= burstStart && timeInCycle < burstStart + glitch.burstInMs;
  }

  /** CRT 한 장을 대상 캔버스로 옮김. 버스트 중이면 채널 분리·가로 띠 변위를 얹음. */
  function presentFrame(glitchSeed: number | null): void {
    if (context === null) {
      return;
    }

    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.clearRect(0, 0, widthInDevicePx, heightInDevicePx);

    const { glitch } = preset;

    if (glitch === null || glitchSeed === null) {
      context.drawImage(frameCanvas, 0, 0);
      return;
    }

    const channelOffset =
      glitch.channelOffsetInCssPx * pixelRatio * (0.5 + hashToUnit(glitchSeed * 1.3) * 0.5);

    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.9;
    context.drawImage(bakedSource.cyanCanvas, -channelOffset, 0);
    context.drawImage(bakedSource.magentaCanvas, channelOffset, 0);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.drawImage(frameCanvas, 0, 0);

    const bandCount = 1 + Math.floor(hashToUnit(glitchSeed * 2.1) * glitch.maxBandCount);

    for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
      const bandSeed = glitchSeed * 5.3 + bandIndex * 11.7;
      const bandHeight = Math.max(
        1,
        Math.round(contentBox.heightInDevicePx * (0.06 + hashToUnit(bandSeed) * 0.14)),
      );
      const bandTop = Math.round(
        contentBox.topInDevicePx +
          hashToUnit(bandSeed + 1) * (contentBox.heightInDevicePx - bandHeight),
      );
      const bandShift =
        (hashToUnit(bandSeed + 2) * 2 - 1) * glitch.maxBandShiftInCssPx * pixelRatio;

      // 띠 자리를 비우고 같은 줄을 옆으로 밀어 다시 찍음.
      context.clearRect(0, bandTop, widthInDevicePx, bandHeight);
      context.drawImage(
        frameCanvas,
        0,
        bandTop,
        widthInDevicePx,
        bandHeight,
        bandShift,
        bandTop,
        widthInDevicePx,
        bandHeight,
      );
    }
  }

  function renderAt(timeInMs: number): void {
    const frameIndex = Math.floor(timeInMs / FRAME_INTERVAL_IN_MS);
    const brightness = 1 - preset.flickerAmount * hashToUnit(frameIndex);
    const glitchSeed = isGlitchBurstAt(timeInMs) ? frameIndex + 1 : null;

    if (preset.rollPeriodInMs <= 0) {
      drawCrtFrame(brightness, null);
    } else {
      const rollProgress = (timeInMs % preset.rollPeriodInMs) / preset.rollPeriodInMs;
      // 띠가 캔버스 위 바깥에서 들어와 아래 바깥으로 나감.
      drawCrtFrame(
        brightness,
        -rollBandHeight + rollProgress * (heightInDevicePx + rollBandHeight),
      );
    }

    presentFrame(glitchSeed);
  }

  function renderRest(): void {
    drawCrtFrame(1, null);
    presentFrame(null);
  }

  return createTimelineController({
    frameIntervalInMs: FRAME_INTERVAL_IN_MS,
    renderAt,
    renderRest,
  });
};
// endregion
