import type { BakedWordmark } from "./bakeWordmarkCanvas";
import { prefersReducedMotion } from "./createGlitchLogoController";
import type { HashStreamPreset } from "./hashStreamPreset";

/**
 * 해시 스트림 재생 엔진.
 *
 * ## 열마다 미리 그려 둔 스트립을 쓰는 이유
 * 매 프레임 모든 칸에 `fillText` 하면 264×64 시안 하나가 프레임당 500회쯤 텍스트를 그림.
 * 시안이 여러 개 뜨면 프레임이 무너짐. 그래서 **열마다 세로 스트립 캔버스를 한 번 그려 두고**,
 * 프레임에선 스트립을 세로로 밀어 `drawImage` 두 번으로 끝냄. 문자를 갈 때만 해당 스트립을 다시 그림.
 *
 * ## 폰트
 * 보이는 캔버스에 직접 `fillText` 하므로 **문서에 로드된 웹폰트를 그대로 씀.**
 * `<foreignObject>` 와 달리 인라인 불필요. ( 격리된 문서가 아님 )
 */

/** 흐르는 문자용 등폭 폰트. 문서에 이미 로드돼 있어 `fillText` 가 바로 씀. */
const STREAM_FONT_FAMILY_NAME = "JetBrains Mono";

/**
 * 프레임 간격(ms).
 *
 * 60fps 불필요. 살짝 끊겨야 터미널 같고, 14fps 면 `drawImage` 횟수가 1/4 로 줆.
 */
const FRAME_INTERVAL_IN_MS = 70;

/** 한 프레임에 문자를 갈아 끼울 열 비율. */
const COLUMN_CHURN_RATIO = 0.12;

interface StreamColumn {
  /** 이 열의 문자를 세로로 그려 둔 스트립. 높이는 캔버스보다 한 칸 이상 긺. */
  stripCanvas: HTMLCanvasElement;
  speedInDevicePxPerSec: number;
  /** 스트립을 위로 민 거리. `stripHeight` 로 나눈 나머지만 유지함. */
  scrollOffsetInDevicePx: number;
}

export interface HashStreamController {
  start(): void;
  stop(): void;
  destroy(): void;
}

interface CreateHashStreamControllerOptions {
  canvas: HTMLCanvasElement;
  bakedWordmark: BakedWordmark;
  preset: HashStreamPreset;
}

// region [Privates]
function pickRandomCharacter(characterSet: string): string {
  return characterSet[Math.floor(Math.random() * characterSet.length)];
}

function pickRandomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
// endregion

// region [Factory]
export function createHashStreamController({
  canvas,
  bakedWordmark,
  preset,
}: CreateHashStreamControllerOptions): HashStreamController {
  const { widthInDevicePx, heightInDevicePx, pixelRatio, baseCanvas } = bakedWordmark;

  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const targetContext = canvas.getContext("2d");

  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = widthInDevicePx;
  scratchCanvas.height = heightInDevicePx;
  const scratchContext = scratchCanvas.getContext("2d");

  const cellWidthInDevicePx = Math.max(1, Math.round(preset.cellWidthInCssPx * pixelRatio));
  const cellHeightInDevicePx = Math.max(1, Math.round(preset.cellHeightInCssPx * pixelRatio));
  const columnCount = Math.ceil(widthInDevicePx / cellWidthInDevicePx);
  // 스트립이 캔버스보다 길어야 밀었을 때 아래가 안 빔.
  const stripRowCount = Math.ceil(heightInDevicePx / cellHeightInDevicePx) + 2;
  const stripHeightInDevicePx = stripRowCount * cellHeightInDevicePx;

  /** 한 열의 스트립을 처음부터 다시 그림. */
  function renderColumnStrip(column: StreamColumn): void {
    const stripContext = column.stripCanvas.getContext("2d");

    if (stripContext === null) {
      return;
    }

    stripContext.clearRect(0, 0, cellWidthInDevicePx, stripHeightInDevicePx);
    // 글자가 칸을 거의 채우게 칸 높이에 맞춤.
    stripContext.font = `700 ${cellHeightInDevicePx * 0.92}px '${STREAM_FONT_FAMILY_NAME}', monospace`;
    stripContext.textAlign = "center";
    stripContext.textBaseline = "middle";

    for (let rowIndex = 0; rowIndex < stripRowCount; rowIndex += 1) {
      stripContext.fillStyle =
        Math.random() < preset.highlightRatio ? preset.highlightColor : preset.streamColor;
      stripContext.fillText(
        pickRandomCharacter(preset.characterSet),
        cellWidthInDevicePx / 2,
        rowIndex * cellHeightInDevicePx + cellHeightInDevicePx / 2,
      );
    }
  }

  const columns: StreamColumn[] = Array.from({ length: columnCount }, () => {
    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = cellWidthInDevicePx;
    stripCanvas.height = stripHeightInDevicePx;

    const [minSpeed, maxSpeed] = preset.columnSpeedRangeInCssPxPerSec;
    const column: StreamColumn = {
      stripCanvas,
      speedInDevicePxPerSec: pickRandomBetween(minSpeed, maxSpeed) * pixelRatio,
      scrollOffsetInDevicePx: Math.random() * stripHeightInDevicePx,
    };

    renderColumnStrip(column);

    return column;
  });

  let animationFrameID: number | null = null;
  let lastFrameTimestampInMs = 0;
  let isRunning = false;
  let isDestroyed = false;

  /** 글리프 모양으로 잘라낸 스트림 한 장을 대상 캔버스에 그림. */
  function drawStreamFrame(): void {
    if (targetContext === null || scratchContext === null) {
      return;
    }

    scratchContext.globalCompositeOperation = "source-over";
    scratchContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);

    columns.forEach((column, columnIndex) => {
      const leftInDevicePx = columnIndex * cellWidthInDevicePx;
      const topInDevicePx = -column.scrollOffsetInDevicePx;

      // 두 번 그려 위아래로 이어 붙임. 한 장이면 민 만큼 아래가 빔.
      scratchContext.drawImage(column.stripCanvas, leftInDevicePx, topInDevicePx);
      scratchContext.drawImage(
        column.stripCanvas,
        leftInDevicePx,
        topInDevicePx + stripHeightInDevicePx,
      );
    });

    // 글리프 알파로 잘라냄. 이 한 줄이 "글자 안쪽에서만 흐름" 을 만듦.
    scratchContext.globalCompositeOperation = "destination-in";
    scratchContext.drawImage(baseCanvas, 0, 0);

    targetContext.globalCompositeOperation = "source-over";
    targetContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
    targetContext.globalAlpha = preset.bodyGhostAlpha;
    targetContext.drawImage(baseCanvas, 0, 0);
    targetContext.globalAlpha = 1;
    targetContext.drawImage(scratchCanvas, 0, 0);
  }

  /** 본체만 그린 기본 상태. 모션 끈 사용자가 보는 화면. */
  function drawRestFrame(): void {
    if (targetContext === null) {
      return;
    }
    targetContext.globalCompositeOperation = "source-over";
    targetContext.globalAlpha = 1;
    targetContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
    targetContext.drawImage(baseCanvas, 0, 0);
  }

  function stepFrame(timestampInMs: number): void {
    if (isDestroyed) {
      return;
    }

    const elapsedInMs = timestampInMs - lastFrameTimestampInMs;

    if (elapsedInMs >= FRAME_INTERVAL_IN_MS) {
      const elapsedInSec = Math.min(elapsedInMs, 250) / 1000;
      lastFrameTimestampInMs = timestampInMs;

      for (const column of columns) {
        column.scrollOffsetInDevicePx =
          (column.scrollOffsetInDevicePx + column.speedInDevicePxPerSec * elapsedInSec) %
          stripHeightInDevicePx;

        if (Math.random() < COLUMN_CHURN_RATIO) {
          renderColumnStrip(column);
        }
      }

      drawStreamFrame();
    }

    animationFrameID = window.requestAnimationFrame(stepFrame);
  }

  drawStreamFrame();

  return {
    start(): void {
      if (isDestroyed || isRunning || prefersReducedMotion()) {
        return;
      }
      isRunning = true;
      lastFrameTimestampInMs = 0;
      animationFrameID = window.requestAnimationFrame(stepFrame);
    },

    stop(): void {
      isRunning = false;

      if (animationFrameID !== null) {
        window.cancelAnimationFrame(animationFrameID);
        animationFrameID = null;
      }
      // 멈출 땐 흐르던 한 장을 그대로 둠. 본체만 남기면 스크롤마다 깜빡임.
    },

    destroy(): void {
      isDestroyed = true;
      isRunning = false;

      if (animationFrameID !== null) {
        window.cancelAnimationFrame(animationFrameID);
        animationFrameID = null;
      }
      drawRestFrame();
    },
  };
}
// endregion
