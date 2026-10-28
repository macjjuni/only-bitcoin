import type { LogoEffectFactory } from "@/shared/lib/wordmark-canvas";
import {
  createTimelineController,
  createTintedCanvas,
  resolveContentBox,
} from "@/shared/lib/wordmark-canvas";
import type { GuillochePreset } from "../model/guillochePreset";

/**
 * 기요셰 재생 엔진.
 *
 * 곡선 수천 개를 매 프레임 그리면 못 버팀. 문양은 생성 시 한 장만 그리고 프레임에선 밀거나 돌리기만 함.
 * - wave: 파장 단위로 주기적이라 폭 + 파장만큼 그려 두고 옆으로 밀면 끝.
 * - rosette: 원형이라 통째로 회전시키면 끝.
 */

// region [Constants]
const FRAME_INTERVAL_IN_MS = 50;
/** 곡선을 근사할 선분 길이(디바이스 px). 이보다 짧게 쪼개도 차이 안 보임. */
const CURVE_STEP_IN_DEVICE_PX = 1.5;
/** 선마다 위상을 이만큼 밀어 물결이 비스듬히 꼬이게 함. */
const LINE_PHASE_DRIFT = 0.32;
// endregion

// region [Privates]
function create2dCanvas(
  widthInDevicePx: number,
  heightInDevicePx: number,
): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(widthInDevicePx));
  canvas.height = Math.max(1, Math.ceil(heightInDevicePx));
  return [canvas, canvas.getContext("2d")];
}

/** 두 묶음( 위상 0, π )의 사인파를 간격마다 그음. 둘이 교차하며 꼬인 띠가 됨. */
function drawWavePattern(
  preset: GuillochePreset,
  pixelRatio: number,
  widthInDevicePx: number,
  heightInDevicePx: number,
  waveLengthInDevicePx: number,
): HTMLCanvasElement {
  const [patternCanvas, patternContext] = create2dCanvas(
    widthInDevicePx + waveLengthInDevicePx,
    heightInDevicePx,
  );

  if (patternContext === null) {
    return patternCanvas;
  }

  const spacingInDevicePx = preset.spacingInCssPx * pixelRatio;
  const amplitudeInDevicePx = preset.amplitudeInCssPx * pixelRatio;

  patternContext.strokeStyle = preset.lineColor;
  patternContext.lineWidth = preset.lineWidthInCssPx * pixelRatio;

  let lineIndex = 0;

  for (
    let baselineY = -amplitudeInDevicePx;
    baselineY <= heightInDevicePx + amplitudeInDevicePx;
    baselineY += spacingInDevicePx
  ) {
    for (const familyPhase of [0, Math.PI]) {
      patternContext.beginPath();

      for (let x = 0; x <= patternCanvas.width; x += CURVE_STEP_IN_DEVICE_PX) {
        const y =
          baselineY +
          amplitudeInDevicePx *
            Math.sin(
              (Math.PI * 2 * x) / waveLengthInDevicePx + familyPhase + lineIndex * LINE_PHASE_DRIFT,
            );

        if (x === 0) {
          patternContext.moveTo(x, y);
        } else {
          patternContext.lineTo(x, y);
        }
      }
      patternContext.stroke();
    }
    lineIndex += 1;
  }

  return patternCanvas;
}

/** 반지름이 꽃잎 수만큼 출렁이는 동심원 묶음. 위상 0, π 두 묶음이 교차해 그물이 됨. */
function drawRosettePattern(preset: GuillochePreset, pixelRatio: number, radiusInDevicePx: number) {
  const sideInDevicePx = radiusInDevicePx * 2;
  const [patternCanvas, patternContext] = create2dCanvas(sideInDevicePx, sideInDevicePx);

  if (patternContext === null) {
    return patternCanvas;
  }

  const center = patternCanvas.width / 2;
  const spacingInDevicePx = preset.spacingInCssPx * pixelRatio;
  const amplitudeInDevicePx = preset.amplitudeInCssPx * pixelRatio;
  const petalCount = Math.round(preset.waveLengthOrPetalCount);

  patternContext.strokeStyle = preset.lineColor;
  patternContext.lineWidth = preset.lineWidthInCssPx * pixelRatio;

  let ringIndex = 0;

  for (
    let baseRadius = spacingInDevicePx;
    baseRadius <= radiusInDevicePx;
    baseRadius += spacingInDevicePx
  ) {
    const segmentCount = Math.max(
      96,
      Math.ceil((Math.PI * 2 * baseRadius) / CURVE_STEP_IN_DEVICE_PX),
    );

    for (const familyPhase of [0, Math.PI]) {
      patternContext.beginPath();

      for (let segmentIndex = 0; segmentIndex <= segmentCount; segmentIndex += 1) {
        const angle = (Math.PI * 2 * segmentIndex) / segmentCount;
        const radius =
          baseRadius +
          amplitudeInDevicePx *
            Math.cos(petalCount * angle + familyPhase + ringIndex * LINE_PHASE_DRIFT);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);

        if (segmentIndex === 0) {
          patternContext.moveTo(x, y);
        } else {
          patternContext.lineTo(x, y);
        }
      }
      patternContext.stroke();
    }
    ringIndex += 1;
  }

  return patternCanvas;
}
// endregion

// region [Factory]
export const createGuillocheEffect: LogoEffectFactory<GuillochePreset> = ({
  canvas,
  bakedSource,
  preset,
}) => {
  const { widthInDevicePx, heightInDevicePx, pixelRatio, baseCanvas } = bakedSource;

  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const context = canvas.getContext("2d");
  const [scratchCanvas, scratchContext] = create2dCanvas(widthInDevicePx, heightInDevicePx);

  if (context === null || scratchContext === null) {
    throw new Error("기요셰 캔버스 컨텍스트를 만들지 못했음.");
  }

  const bodyCanvas = createTintedCanvas(baseCanvas, preset.bodyColor);
  const contentBox = resolveContentBox(bakedSource);
  const centerX = contentBox.leftInDevicePx + contentBox.widthInDevicePx / 2;
  const centerY = contentBox.topInDevicePx + contentBox.heightInDevicePx / 2;
  const waveLengthInDevicePx = preset.waveLengthOrPetalCount * pixelRatio;
  // 회전해도 모서리가 비지 않게 대각선 절반을 반지름으로 씀.
  const rosetteRadiusInDevicePx = Math.hypot(widthInDevicePx, heightInDevicePx) / 2;

  const patternCanvas =
    preset.pattern === "wave"
      ? drawWavePattern(preset, pixelRatio, widthInDevicePx, heightInDevicePx, waveLengthInDevicePx)
      : drawRosettePattern(preset, pixelRatio, rosetteRadiusInDevicePx);

  function renderAt(timeInMs: number): void {
    if (context === null || scratchContext === null) {
      return;
    }

    const elapsedInSec = timeInMs / 1000;

    scratchContext.globalCompositeOperation = "source-over";
    scratchContext.clearRect(0, 0, widthInDevicePx, heightInDevicePx);

    if (preset.pattern === "wave") {
      const offsetInDevicePx = (elapsedInSec * preset.speed * pixelRatio) % waveLengthInDevicePx;
      scratchContext.drawImage(patternCanvas, -offsetInDevicePx, 0);
    } else {
      scratchContext.save();
      scratchContext.translate(centerX, centerY);
      scratchContext.rotate((elapsedInSec * preset.speed * Math.PI) / 180);
      scratchContext.drawImage(patternCanvas, -patternCanvas.width / 2, -patternCanvas.height / 2);
      scratchContext.restore();
    }

    // 글자 알파로 문양을 잘라냄.
    scratchContext.globalCompositeOperation = "destination-in";
    scratchContext.drawImage(baseCanvas, 0, 0);

    context.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
    context.globalAlpha = preset.bodyAlpha;
    context.drawImage(bodyCanvas, 0, 0);
    context.globalAlpha = 1;
    context.drawImage(scratchCanvas, 0, 0);
  }

  return createTimelineController({
    frameIntervalInMs: FRAME_INTERVAL_IN_MS,
    renderAt,
    // 정지 화면도 문양이 로고 본체라 0초 프레임을 그대로 씀.
    renderRest: () => renderAt(0),
  });
};
// endregion
