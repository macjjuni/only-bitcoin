import { createTimelineController } from "./createTimelineController";
import type { DitherPreset } from "./ditherPreset";
import type { LogoEffectFactory } from "./logoEffect";
import {
  parseHexColor,
  readAlphaData,
  resolveContentBox,
  sampleCoverageGrid,
} from "./maskSampling";

/**
 * 1-bit 디더 재생 엔진.
 *
 * 디더 점 하나 = 저해상도 캔버스 픽셀 하나. `ImageData` 에 직접 쓰고 스무딩 끈 채 확대해 찍음.
 * 점마다 `fillRect` 하는 것보다 수십 배 빠름.
 */

// region [Constants]
const FRAME_INTERVAL_IN_MS = 66;
/** sweep 띠 폭( 로고 폭 대비 표준편차 ). */
const SWEEP_BAND_SIGMA = 0.14;
// endregion

// region [Privates]
/** 재귀로 n×n 베이어 행렬을 만들고 0~1 임계값으로 정규화. */
function createBayerThresholds(matrixSize: number): Float32Array {
  let matrix = [[0]];

  while (matrix.length < matrixSize) {
    const size = matrix.length;
    const nextMatrix: number[][] = Array.from({ length: size * 2 }, () =>
      new Array(size * 2).fill(0),
    );

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = matrix[y][x] * 4;
        nextMatrix[y][x] = value;
        nextMatrix[y][x + size] = value + 2;
        nextMatrix[y + size][x] = value + 3;
        nextMatrix[y + size][x + size] = value + 1;
      }
    }
    matrix = nextMatrix;
  }

  const cellCount = matrixSize * matrixSize;
  return Float32Array.from(matrix.flat(), (value) => (value + 0.5) / cellCount);
}

/** 시각 t 에서 (u, v) 위치 밝기( 0~1 ). u·v 는 박스 기준 0~1. */
function resolveLuminance(
  preset: DitherPreset,
  u: number,
  v: number,
  aspectRatio: number,
  timeInMs: number,
): number {
  const verticalShade = 1 - v * 0.85;

  if (preset.light === "static") {
    return verticalShade;
  }

  const cycleProgress = (timeInMs % preset.cycleInMs) / preset.cycleInMs;

  if (preset.light === "sweep") {
    // 띠가 박스 밖에서 들어와 밖으로 나감. 한 바퀴의 절반은 띠 없이 쉼.
    const bandCenter = -0.4 + cycleProgress * 2.4;
    const band = Math.exp(-((u - bandCenter) ** 2) / (2 * SWEEP_BAND_SIGMA ** 2));
    return 0.32 + verticalShade * 0.18 + band * 0.62;
  }

  const angle = cycleProgress * Math.PI * 2;
  const lightU = 0.5 + 0.55 * Math.cos(angle);
  const lightV = 0.5 + 0.55 * Math.sin(angle);
  // 가로로 긴 워드마크에서 광원 거리가 찌그러지지 않게 가로축을 비율만큼 늘림.
  const distance =
    Math.hypot((u - lightU) * aspectRatio, v - lightV) / Math.max(1, aspectRatio * 0.6);
  return 1.05 - distance * 1.1;
}
// endregion

// region [Factory]
export const createDitherEffect: LogoEffectFactory<DitherPreset> = ({
  canvas,
  bakedSource,
  preset,
}) => {
  const { widthInDevicePx, heightInDevicePx, pixelRatio, baseCanvas } = bakedSource;

  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("디더 캔버스 컨텍스트를 만들지 못했음.");
  }

  const contentBox = resolveContentBox(bakedSource);
  const cellSizeInDevicePx = preset.cellSizeInCssPx * pixelRatio;
  const columnCount = Math.ceil(contentBox.widthInDevicePx / cellSizeInDevicePx);
  const rowCount = Math.ceil(contentBox.heightInDevicePx / cellSizeInDevicePx);
  const gridLeft =
    contentBox.leftInDevicePx + (contentBox.widthInDevicePx - columnCount * cellSizeInDevicePx) / 2;
  const gridTop =
    contentBox.topInDevicePx + (contentBox.heightInDevicePx - rowCount * cellSizeInDevicePx) / 2;

  const coverage = sampleCoverageGrid(readAlphaData(baseCanvas), {
    leftInDevicePx: gridLeft,
    topInDevicePx: gridTop,
    cellSizeInDevicePx,
    columnCount,
    rowCount,
  });
  const bayerThresholds = createBayerThresholds(preset.matrixSize);
  const aspectRatio = contentBox.widthInDevicePx / contentBox.heightInDevicePx;
  const [onRed, onGreen, onBlue] = parseHexColor(preset.onColor);
  const offRgb = preset.offColor === null ? null : parseHexColor(preset.offColor);

  const lowResCanvas = document.createElement("canvas");
  lowResCanvas.width = columnCount;
  lowResCanvas.height = rowCount;
  const lowResContext = lowResCanvas.getContext("2d");
  const imageData = lowResContext?.createImageData(columnCount, rowCount) ?? null;

  function renderAt(timeInMs: number): void {
    if (context === null || lowResContext === null || imageData === null) {
      return;
    }

    const { data } = imageData;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const v = (rowIndex + 0.5) / rowCount;

      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const cellIndex = rowIndex * columnCount + columnIndex;
        const pixelOffset = cellIndex * 4;

        if (coverage[cellIndex] < preset.coverageThreshold) {
          data[pixelOffset + 3] = 0;
          continue;
        }

        const luminance = resolveLuminance(
          preset,
          (columnIndex + 0.5) / columnCount,
          v,
          aspectRatio,
          timeInMs,
        );
        const threshold =
          bayerThresholds[
            (rowIndex % preset.matrixSize) * preset.matrixSize + (columnIndex % preset.matrixSize)
          ];
        const isOn = luminance > threshold;

        if (isOn) {
          data[pixelOffset] = onRed;
          data[pixelOffset + 1] = onGreen;
          data[pixelOffset + 2] = onBlue;
          data[pixelOffset + 3] = 255;
        } else if (offRgb !== null) {
          data[pixelOffset] = offRgb[0];
          data[pixelOffset + 1] = offRgb[1];
          data[pixelOffset + 2] = offRgb[2];
          data[pixelOffset + 3] = 255;
        } else {
          data[pixelOffset + 3] = 0;
        }
      }
    }

    lowResContext.putImageData(imageData, 0, 0);

    context.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
    // 확대할 때 보간하면 1비트 점이 번져 회색이 됨.
    context.imageSmoothingEnabled = false;
    context.drawImage(
      lowResCanvas,
      gridLeft,
      gridTop,
      columnCount * cellSizeInDevicePx,
      rowCount * cellSizeInDevicePx,
    );
  }

  return createTimelineController({
    frameIntervalInMs:
      preset.light === "static" ? null : (preset.frameIntervalInMs ?? FRAME_INTERVAL_IN_MS),
    renderAt,
    renderRest: () => renderAt(0),
  });
};
// endregion
