import type { LogoEffectFactory } from "@/shared/lib/wordmark-canvas";
import {
  createTimelineController,
  readAlphaData,
  resolveContentBox,
  sampleCoverageGrid,
} from "@/shared/lib/wordmark-canvas";
import type { DotMatrixPreset } from "../model/dotMatrixPreset";

/**
 * 도트 매트릭스 재생 엔진.
 *
 * 도트마다 `arc` 를 그리면 대형 기준 프레임당 4천 번이라, 도트 스프라이트를 미리 굽고 `drawImage` 만 함.
 * 꺼진 도트 판은 안 변하므로 배경 캔버스 한 장으로 구워 두고 켜진 도트만 위에 찍음.
 */

// region [Constants]
const FRAME_INTERVAL_IN_MS = 16;
/** 번짐 스프라이트는 도트보다 이만큼 큼. */
const GLOW_SPRITE_SCALE = 2.4;
/** `scan`: 판을 다 훑고 나서 쉬는 줄 수. */
const SCAN_IDLE_ROW_COUNT = 24;
// endregion

// region [Privates]
function createDotSprite(
  diameterInDevicePx: number,
  color: string,
  glowColor: string | null,
): HTMLCanvasElement {
  const spriteSizeInDevicePx = Math.ceil(
    glowColor === null ? diameterInDevicePx + 2 : diameterInDevicePx * GLOW_SPRITE_SCALE,
  );
  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = spriteSizeInDevicePx;
  spriteCanvas.height = spriteSizeInDevicePx;

  const spriteContext = spriteCanvas.getContext("2d");

  if (spriteContext === null) {
    return spriteCanvas;
  }

  const center = spriteSizeInDevicePx / 2;

  if (glowColor !== null) {
    const glowGradient = spriteContext.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      center,
    );
    glowGradient.addColorStop(0, glowColor);
    glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    spriteContext.fillStyle = glowGradient;
    spriteContext.fillRect(0, 0, spriteSizeInDevicePx, spriteSizeInDevicePx);
  }

  spriteContext.fillStyle = color;
  spriteContext.beginPath();
  spriteContext.arc(center, center, diameterInDevicePx / 2, 0, Math.PI * 2);
  spriteContext.fill();

  return spriteCanvas;
}
// endregion

// region [Factory]
export const createDotMatrixEffect: LogoEffectFactory<DotMatrixPreset> = ({
  canvas,
  bakedSource,
  preset,
}) => {
  const { widthInDevicePx, heightInDevicePx, pixelRatio, baseCanvas } = bakedSource;

  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("도트 매트릭스 캔버스 컨텍스트를 만들지 못했음.");
  }

  const contentBox = resolveContentBox(bakedSource);
  const pitchInDevicePx = preset.pitchInCssPx * pixelRatio;
  const diameterInDevicePx = pitchInDevicePx * preset.dotDiameterRatio;
  const columnCount = Math.floor(contentBox.widthInDevicePx / pitchInDevicePx);
  const rowCount = Math.floor(contentBox.heightInDevicePx / pitchInDevicePx);
  const boardLeft =
    contentBox.leftInDevicePx + (contentBox.widthInDevicePx - columnCount * pitchInDevicePx) / 2;
  const boardTop =
    contentBox.topInDevicePx + (contentBox.heightInDevicePx - rowCount * pitchInDevicePx) / 2;

  const coverage = sampleCoverageGrid(readAlphaData(baseCanvas), {
    leftInDevicePx: boardLeft,
    topInDevicePx: boardTop,
    cellSizeInDevicePx: pitchInDevicePx,
    columnCount,
    rowCount,
  });
  const litMask = coverage.map((value) => (value >= preset.coverageThreshold ? 1 : 0));

  const litSprite = createDotSprite(diameterInDevicePx, preset.litColor, preset.glowColor);
  const scanSprite = createDotSprite(diameterInDevicePx, preset.scanColor, preset.glowColor);
  const unlitSprite = createDotSprite(diameterInDevicePx, preset.unlitColor, null);

  // 꺼진 도트 판은 한 장으로 구워 둠.
  const boardCanvas = document.createElement("canvas");
  boardCanvas.width = widthInDevicePx;
  boardCanvas.height = heightInDevicePx;
  const boardContext = boardCanvas.getContext("2d");

  function resolveDotCenter(columnIndex: number, rowIndex: number): [number, number] {
    return [
      boardLeft + (columnIndex + 0.5) * pitchInDevicePx,
      boardTop + (rowIndex + 0.5) * pitchInDevicePx,
    ];
  }

  function stampSprite(
    targetContext: CanvasRenderingContext2D,
    sprite: HTMLCanvasElement,
    columnIndex: number,
    rowIndex: number,
  ): void {
    const [centerX, centerY] = resolveDotCenter(columnIndex, rowIndex);
    targetContext.drawImage(sprite, centerX - sprite.width / 2, centerY - sprite.height / 2);
  }

  if (boardContext !== null) {
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        stampSprite(boardContext, unlitSprite, columnIndex, rowIndex);
      }
    }
  }

  const tickerColumnCount = columnCount + Math.round(columnCount * preset.tickerGapRatio);
  let lastRenderedStep = -1;

  /**
   * `shiftColumnCount` 만큼 왼쪽으로 민 판을 그림. `scanRowIndex` 줄은 밝은 색.
   * 원본 열이 로고 폭을 넘으면 빈 칸이라 꺼진 도트만 남음.
   */
  function drawBoard(shiftColumnCount: number, scanRowIndex: number): void {
    if (context === null) {
      return;
    }

    context.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
    context.drawImage(boardCanvas, 0, 0);

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const sprite = rowIndex === scanRowIndex ? scanSprite : litSprite;

      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const sourceColumnIndex =
          shiftColumnCount === 0
            ? columnIndex
            : (columnIndex + shiftColumnCount) % tickerColumnCount;

        if (sourceColumnIndex >= columnCount) {
          continue;
        }
        if (litMask[rowIndex * columnCount + sourceColumnIndex] === 0) {
          continue;
        }
        stampSprite(context, sprite, columnIndex, rowIndex);
      }
    }
  }

  function renderAt(timeInMs: number): void {
    if (preset.mode === "static") {
      drawBoard(0, -1);
      return;
    }

    const step = Math.floor(timeInMs / preset.stepInMs);

    // 도트는 칸 단위로만 바뀜. 같은 칸이면 다시 그릴 필요 없음.
    if (step === lastRenderedStep) {
      return;
    }
    lastRenderedStep = step;

    if (preset.mode === "ticker") {
      drawBoard(step % tickerColumnCount, -1);
      return;
    }
    drawBoard(0, step % (rowCount + SCAN_IDLE_ROW_COUNT));
  }

  function renderRest(): void {
    lastRenderedStep = -1;
    drawBoard(0, -1);
  }

  return createTimelineController({
    frameIntervalInMs: preset.mode === "static" ? null : FRAME_INTERVAL_IN_MS,
    renderAt: (timeInMs) => {
      // trigger 로 0 부터 다시 그릴 땐 캐시를 비워야 첫 칸이 그려짐.
      if (timeInMs === 0) {
        lastRenderedStep = -1;
      }
      renderAt(timeInMs);
    },
    renderRest,
  });
};
// endregion
