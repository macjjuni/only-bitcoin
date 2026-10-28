import { prefersReducedMotion } from "./createGlitchLogoController";
import type { LogoEffectController } from "./logoEffect";

/**
 * 새 시안 공용 재생 루프.
 *
 * 효과는 "시각 t 에서 어떤 그림인가" 만 알면 됨. rAF·일시정지·모션 줄이기 처리는 여기서 다 함.
 * 화면 밖에서 멈췄다 돌아와도 이어지도록 t 는 실제 경과 시간만 누적함.
 */

// region [Types]
interface CreateTimelineControllerOptions {
  /** 프레임 간격(ms). null 이면 정지 시안이라 루프를 안 돌림. */
  frameIntervalInMs: number | null;
  renderAt(timeInMs: number): void;
  /** 모션 줄이기·파기 시 남길 정지 화면. */
  renderRest(): void;
}
// endregion

// region [Constants]
/** 탭 전환 등으로 한 번에 크게 건너뛰는 것 방지용 상한. */
const MAX_FRAME_STEP_IN_MS = 100;
// endregion

// region [Easings]
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function easeInOutCubic(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

/** 시드 하나로 0~1 의사난수. 사이클마다 같은 값을 다시 뽑아야 하는 곳에 씀. */
export function hashToUnit(seed: number): number {
  const sineValue = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return sineValue - Math.floor(sineValue);
}
// endregion

// region [Factory]
export function createTimelineController({
  frameIntervalInMs,
  renderAt,
  renderRest,
}: CreateTimelineControllerOptions): LogoEffectController {
  let animationFrameID: number | null = null;
  let timelineInMs = 0;
  let lastTimestampInMs: number | null = null;
  let lastRenderedTimestampInMs = Number.NEGATIVE_INFINITY;
  let isRunning = false;
  let isDestroyed = false;

  function cancelFrame(): void {
    if (animationFrameID !== null) {
      window.cancelAnimationFrame(animationFrameID);
      animationFrameID = null;
    }
  }

  function stepFrame(timestampInMs: number): void {
    if (isDestroyed || frameIntervalInMs === null) {
      return;
    }

    if (lastTimestampInMs !== null) {
      timelineInMs += Math.min(timestampInMs - lastTimestampInMs, MAX_FRAME_STEP_IN_MS);
    }
    lastTimestampInMs = timestampInMs;

    if (timestampInMs - lastRenderedTimestampInMs >= frameIntervalInMs) {
      lastRenderedTimestampInMs = timestampInMs;
      renderAt(timelineInMs);
    }

    animationFrameID = window.requestAnimationFrame(stepFrame);
  }

  // 정지 시안은 모션 줄이기와 무관하게 그대로 그림. 움직이는 시안만 정지 화면으로 바꿈.
  if (frameIntervalInMs !== null && prefersReducedMotion()) {
    renderRest();
  } else {
    renderAt(0);
  }

  return {
    start(): void {
      if (isDestroyed || isRunning || frameIntervalInMs === null || prefersReducedMotion()) {
        return;
      }
      isRunning = true;
      lastTimestampInMs = null;
      animationFrameID = window.requestAnimationFrame(stepFrame);
    },

    stop(): void {
      isRunning = false;
      cancelFrame();
      // 마지막 프레임은 그대로 둠. 지우면 스크롤마다 깜빡임.
    },

    trigger(): void {
      if (isDestroyed || prefersReducedMotion()) {
        return;
      }
      timelineInMs = 0;
      renderAt(0);
    },

    destroy(): void {
      isDestroyed = true;
      isRunning = false;
      cancelFrame();
      renderRest();
    },
  };
}
// endregion
