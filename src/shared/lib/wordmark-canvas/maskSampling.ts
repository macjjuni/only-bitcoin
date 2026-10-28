import { BAKE_PADDING_IN_CSS_PX } from "./bakeWordmarkCanvas";
import type { BakedLogoSource } from "./logoEffect";

/**
 * 구운 텍스처의 알파를 읽어 격자·경계·글자 구간으로 바꾸는 헬퍼.
 *
 * `getImageData` 는 비싸서 시안 하나당 생성 시 한 번만 읽음. 프레임에서는 여기서 만든 배열만 씀.
 */

// region [Types]
/** 패딩을 뺀 실제 로고 박스( 디바이스 px ). */
export interface ContentBox {
  leftInDevicePx: number;
  topInDevicePx: number;
  widthInDevicePx: number;
  heightInDevicePx: number;
}

export interface AlphaData {
  alpha: Uint8ClampedArray;
  widthInDevicePx: number;
  heightInDevicePx: number;
}

export interface GridLayout {
  leftInDevicePx: number;
  topInDevicePx: number;
  cellSizeInDevicePx: number;
  columnCount: number;
  rowCount: number;
}

export interface OpaqueBounds {
  leftInDevicePx: number;
  topInDevicePx: number;
  rightInDevicePx: number;
  bottomInDevicePx: number;
}

export interface ColumnRun {
  startInDevicePx: number;
  endInDevicePx: number;
}
// endregion

// region [Constants]
/** 이 값 이하 알파는 안티에일리어싱 찌꺼기로 보고 빈 칸 취급. */
const OPAQUE_ALPHA_THRESHOLD = 24;
// endregion

// region [Transactions]
export function resolveContentBox(bakedSource: BakedLogoSource): ContentBox {
  const paddingInDevicePx = BAKE_PADDING_IN_CSS_PX * bakedSource.pixelRatio;

  return {
    leftInDevicePx: paddingInDevicePx,
    topInDevicePx: paddingInDevicePx,
    widthInDevicePx: bakedSource.widthInDevicePx - paddingInDevicePx * 2,
    heightInDevicePx: bakedSource.heightInDevicePx - paddingInDevicePx * 2,
  };
}

/** 알파 채널만 뽑아 둠. RGBA 전체를 들고 다닐 이유 없음. */
export function readAlphaData(sourceCanvas: HTMLCanvasElement): AlphaData {
  const context = sourceCanvas.getContext("2d");

  if (context === null) {
    throw new Error("알파를 읽을 캔버스 컨텍스트가 없음.");
  }

  const { width, height } = sourceCanvas;
  const { data } = context.getImageData(0, 0, width, height);
  const alpha = new Uint8ClampedArray(width * height);

  for (let pixelIndex = 0; pixelIndex < alpha.length; pixelIndex += 1) {
    alpha[pixelIndex] = data[pixelIndex * 4 + 3];
  }

  return { alpha, widthInDevicePx: width, heightInDevicePx: height };
}

/**
 * 박스를 정사각 셀로 나눠 셀마다 알파 평균( 0~1 )을 구함.
 * 블록·도트·디더가 전부 이 값 하나로 켜고 끔을 정함.
 */
export function sampleCoverageGrid(alphaData: AlphaData, layout: GridLayout): Float32Array {
  const { alpha, widthInDevicePx, heightInDevicePx } = alphaData;
  const { leftInDevicePx, topInDevicePx, cellSizeInDevicePx, columnCount, rowCount } = layout;
  const coverage = new Float32Array(columnCount * rowCount);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const top = Math.max(0, Math.floor(topInDevicePx + rowIndex * cellSizeInDevicePx));
    const bottom = Math.min(
      heightInDevicePx,
      Math.floor(topInDevicePx + (rowIndex + 1) * cellSizeInDevicePx),
    );

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const left = Math.max(0, Math.floor(leftInDevicePx + columnIndex * cellSizeInDevicePx));
      const right = Math.min(
        widthInDevicePx,
        Math.floor(leftInDevicePx + (columnIndex + 1) * cellSizeInDevicePx),
      );
      let alphaSum = 0;
      let pixelCount = 0;

      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          alphaSum += alpha[y * widthInDevicePx + x];
          pixelCount += 1;
        }
      }

      coverage[rowIndex * columnCount + columnIndex] =
        pixelCount === 0 ? 0 : alphaSum / (pixelCount * 255);
    }
  }

  return coverage;
}

/** 불투명 픽셀이 있는 최소 사각형. 비어 있으면 null. */
export function findOpaqueBounds(alphaData: AlphaData): OpaqueBounds | null {
  const { alpha, widthInDevicePx, heightInDevicePx } = alphaData;
  let left = widthInDevicePx;
  let top = heightInDevicePx;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < heightInDevicePx; y += 1) {
    for (let x = 0; x < widthInDevicePx; x += 1) {
      if (alpha[y * widthInDevicePx + x] <= OPAQUE_ALPHA_THRESHOLD) {
        continue;
      }
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < 0) {
    return null;
  }
  return {
    leftInDevicePx: left,
    topInDevicePx: top,
    rightInDevicePx: right + 1,
    bottomInDevicePx: bottom + 1,
  };
}

/**
 * 빈 세로줄로 끊기는 구간 = 글자 하나로 봄.
 * 폭이 `minRunWidthInDevicePx` 보다 좁은 조각은 앞 구간에 붙임. 안티에일리어싱 부스러기 대응.
 */
export function findColumnRuns(
  alphaData: AlphaData,
  bounds: OpaqueBounds,
  minRunWidthInDevicePx: number,
): ColumnRun[] {
  const { alpha, widthInDevicePx } = alphaData;
  const runs: ColumnRun[] = [];
  let runStart: number | null = null;

  for (let x = bounds.leftInDevicePx; x <= bounds.rightInDevicePx; x += 1) {
    let isOpaqueColumn = false;

    if (x < bounds.rightInDevicePx) {
      for (let y = bounds.topInDevicePx; y < bounds.bottomInDevicePx; y += 1) {
        if (alpha[y * widthInDevicePx + x] > OPAQUE_ALPHA_THRESHOLD) {
          isOpaqueColumn = true;
          break;
        }
      }
    }

    if (isOpaqueColumn && runStart === null) {
      runStart = x;
    }
    if (!isOpaqueColumn && runStart !== null) {
      const previousRun = runs[runs.length - 1];

      if (previousRun !== undefined && x - runStart < minRunWidthInDevicePx) {
        previousRun.endInDevicePx = x;
      } else {
        runs.push({ startInDevicePx: runStart, endInDevicePx: x });
      }
      runStart = null;
    }
  }

  return runs;
}

/** `#RRGGBB` → [r, g, b]. 디더처럼 픽셀을 직접 쓰는 곳에서만 씀. */
export function parseHexColor(hexColor: string): [number, number, number] {
  const normalizedHex = hexColor.replace("#", "");

  return [
    Number.parseInt(normalizedHex.slice(0, 2), 16),
    Number.parseInt(normalizedHex.slice(2, 4), 16),
    Number.parseInt(normalizedHex.slice(4, 6), 16),
  ];
}
// endregion
