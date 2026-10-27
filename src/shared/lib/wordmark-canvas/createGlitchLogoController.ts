import type { BakedWordmark } from "./bakeWordmarkCanvas";
import type { GlitchPreset } from "./glitchPreset";
import {
  createRandomFrameParams,
  createRestFrameParams,
  renderGlitchFrame,
} from "./renderGlitchFrame";

/**
 * 글리치 로고의 재생 엔진.
 *
 * React 밖의 명령형 컨트롤러로 분리했다. 타이머·`requestAnimationFrame` 핸들·스크래치 캔버스를
 * 컴포넌트 안에서 `useRef` 로 끌고 다니면 의존성 배열과 스테일 클로저 싸움이 끝나지 않는다.
 * 컴포넌트는 이 컨트롤러를 만들고 `destroy` 만 책임지면 된다.
 */

/**
 * 재생 모드.
 *
 * - `production`: 실제로 서비스에 나갈 동작. `정지 -> 대기 -> 짧은 버스트 -> 정지` 반복.
 * - `continuous`: 쉬지 않고 글리치 프레임을 갈아 끼운다. 움직임의 성격을 보려면 이 모드다.
 * - `frozen`: 글리치 한 프레임을 그려 놓고 멈춘다. **시안 비교는 사실상 이 모드로만 가능하다.**
 *
 * `production` 의 버스트는 수십 ms 짜리라, 네 개를 각자 다른 시각에 튀게 해 놓고 비교하라는 건
 * 불가능한 요구였다. 그래서 랩에 `frozen` 과 `continuous` 를 따로 둔다.
 */
export type GlitchPlaybackMode = "production" | "continuous" | "frozen";

/**
 * 글리치 프레임 하나를 유지하는 시간(ms).
 *
 * `requestAnimationFrame` 마다 새 프레임을 그리면 한 프레임이 16ms 라 지각 한계 아래로 떨어진다.
 * 2프레임 버스트가 33ms, 즉 눈 깜빡임보다 짧아진다. 실제 글리치 연출이 프레임을 50~80ms 씩
 * 붙잡아 두는 것과 같은 이유로 여기서도 붙잡는다.
 */
const GLITCH_FRAME_HOLD_DURATION_IN_MS = 70;

export interface GlitchLogoController {
  /** 모드에 맞는 재생을 시작한다. 이미 돌고 있으면 무시한다. */
  start(): void;
  /** 재생을 멈춘다. `production` · `continuous` 는 정지 프레임으로 되돌아간다. */
  stop(): void;
  /** 대기를 건너뛰고 지금 바로 한 번 튀게 한다. `frozen` 모드에서는 새 프레임을 다시 뽑는다. */
  triggerBurstNow(): void;
  /** 모든 타이머·프레임 핸들을 해제한다. 언마운트 시 반드시 호출한다. */
  destroy(): void;
}

interface CreateGlitchLogoControllerOptions {
  canvas: HTMLCanvasElement;
  bakedWordmark: BakedWordmark;
  preset: GlitchPreset;
  playbackMode: GlitchPlaybackMode;
}

// region [Privates]
/** 사용자가 OS 에서 모션 줄이기를 켰는지 여부. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
// endregion

// region [Factory]
export function createGlitchLogoController({
  canvas,
  bakedWordmark,
  preset,
  playbackMode,
}: CreateGlitchLogoControllerOptions): GlitchLogoController {
  const { widthInDevicePx, heightInDevicePx } = bakedWordmark;

  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const targetContext = canvas.getContext("2d");

  // 버스트 중 매 프레임 캔버스를 새로 만들면 GC 가 프레임을 먹는다. 수명 내내 하나를 재사용한다.
  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = widthInDevicePx;
  scratchCanvas.height = heightInDevicePx;

  /** 글리치 프레임이 **정지 상태와 구분되는** 움직임인지. `frozen` 은 정지 이미지라 해당 없음. */
  const isAnimatedMode = playbackMode !== "frozen";

  let idleTimeoutID: number | null = null;
  let animationFrameID: number | null = null;
  let lastGlitchFrameTimestampInMs = 0;
  let remainingBurstFrameCount = 0;
  let isRunning = false;
  let isDestroyed = false;

  /** 글리치 없는 정지 프레임을 그린다. */
  function drawRestFrame(): void {
    if (targetContext === null) {
      return;
    }
    renderGlitchFrame(
      targetContext,
      scratchCanvas,
      bakedWordmark,
      createRestFrameParams(preset, bakedWordmark),
    );
  }

  /** 난수 파라미터로 글리치 한 프레임을 그린다. */
  function drawRandomGlitchFrame(): void {
    if (targetContext === null) {
      return;
    }
    renderGlitchFrame(
      targetContext,
      scratchCanvas,
      bakedWordmark,
      createRandomFrameParams(preset, bakedWordmark),
    );
  }

  function clearPendingHandles(): void {
    if (idleTimeoutID !== null) {
      window.clearTimeout(idleTimeoutID);
      idleTimeoutID = null;
    }
    if (animationFrameID !== null) {
      window.cancelAnimationFrame(animationFrameID);
      animationFrameID = null;
    }
  }

  function scheduleNextBurst(): void {
    if (isDestroyed || !isRunning) {
      return;
    }

    const [minIdleInMs, maxIdleInMs] = preset.idleDurationRangeInMs;
    const idleDurationInMs = minIdleInMs + Math.random() * (maxIdleInMs - minIdleInMs);

    idleTimeoutID = window.setTimeout(startBurst, idleDurationInMs);
  }

  /**
   * 프레임을 `GLITCH_FRAME_HOLD_DURATION_IN_MS` 만큼 붙잡으면서 글리치를 진행한다.
   *
   * `setTimeout` 체인이 아니라 `requestAnimationFrame` + 타임스탬프 비교를 쓴다. 백그라운드
   * 탭에서 `setTimeout` 은 계속 깨어나지만 `requestAnimationFrame` 은 멈추기 때문이다.
   */
  function stepGlitchFrame(timestampInMs: number): void {
    if (isDestroyed) {
      return;
    }

    const isFrameHoldElapsed =
      timestampInMs - lastGlitchFrameTimestampInMs >= GLITCH_FRAME_HOLD_DURATION_IN_MS;

    if (isFrameHoldElapsed) {
      lastGlitchFrameTimestampInMs = timestampInMs;

      const isBurstFinished = playbackMode === "production" && remainingBurstFrameCount <= 0;

      if (isBurstFinished) {
        animationFrameID = null;
        drawRestFrame();
        scheduleNextBurst();
        return;
      }

      drawRandomGlitchFrame();
      remainingBurstFrameCount -= 1;
    }

    animationFrameID = window.requestAnimationFrame(stepGlitchFrame);
  }

  function startBurst(): void {
    idleTimeoutID = null;
    remainingBurstFrameCount = preset.burstFrameCount;
    // 0 으로 두면 첫 비교에서 바로 통과해 프레임이 즉시 그려진다.
    lastGlitchFrameTimestampInMs = 0;

    if (animationFrameID === null) {
      animationFrameID = window.requestAnimationFrame(stepGlitchFrame);
    }
  }

  drawRestFrame();

  return {
    start(): void {
      if (isDestroyed || isRunning) {
        return;
      }

      /*
       * `frozen` 은 정지 이미지라 모션 줄이기와 무관하다. 오히려 모션을 끈 사용자에게
       * 글리치가 어떻게 생겼는지 보여줄 수 있는 유일한 모드다.
       */
      if (playbackMode === "frozen") {
        drawRandomGlitchFrame();
        return;
      }

      if (prefersReducedMotion()) {
        return;
      }

      isRunning = true;

      if (playbackMode === "continuous") {
        lastGlitchFrameTimestampInMs = 0;
        animationFrameID = window.requestAnimationFrame(stepGlitchFrame);
        return;
      }

      scheduleNextBurst();
    },

    stop(): void {
      // 멈춰 있는 정지 이미지를 지울 이유가 없다. 화면 밖으로 나갔다 돌아올 때마다
      // 프레임이 바뀌면 비교 중에 눈이 흔들린다.
      if (!isAnimatedMode) {
        return;
      }

      isRunning = false;
      clearPendingHandles();
      drawRestFrame();
    },

    triggerBurstNow(): void {
      if (isDestroyed) {
        return;
      }

      if (playbackMode === "frozen") {
        drawRandomGlitchFrame();
        return;
      }

      if (prefersReducedMotion()) {
        return;
      }

      clearPendingHandles();
      startBurst();
    },

    destroy(): void {
      isDestroyed = true;
      isRunning = false;
      clearPendingHandles();
    },
  };
}
// endregion
