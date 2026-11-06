"use client";

import { Footprints } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import { SPACE_KICK } from "@/entities/space";
import type { SpaceInputSource } from "../model/spaceInputSource";

/** 점프 버튼과 같은 크기. 엄지로 둘을 오가기 쉽게 맞춤. */
const BUTTON_DIAMETER = 58;
const ICON_SIZE = 22;
const ICON_STROKE_WIDTH = 2.25;
/** 점프 버튼 오른쪽 여백(1.5rem + 7px) + 지름 + 간격. 점프 버튼 바로 왼쪽에 놓임. */
const RIGHT_OFFSET = "calc(1.5rem + 7px + 58px + 14px + env(safe-area-inset-right))";
const BOTTOM_OFFSET = "calc(4.5rem + 7px + env(safe-area-inset-bottom))";
const RING_RADIUS = 27;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
/** 남은 비율을 이 단위로 끊어 상태를 바꿈. 매 프레임 리렌더하지 않게 함. */
const RING_STEPS = 60;

interface KickButtonProps {
  inputSource: SpaceInputSource;
}

/**
 * 손가락 기기 전용 발차기 버튼.
 *
 * 누른 순간 요청 한 번만 남김. 쿨다운·대상 판정은 씬이 함. 버튼은 씬이 정한
 * `kickCooldownUntil` 을 읽어 남은 시간을 테두리로 그림. 키보드(F)로 찬 경우에도
 * 같은 값을 보므로 표시가 어긋나지 않음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function KickButton({ inputSource }: KickButtonProps): ReactNode {
  // region [Hooks]
  /** 남은 쿨다운 비율(0~1)을 `RING_STEPS` 단위로 끊은 값. */
  const [remainingStep, setRemainingStep] = useState<number>(0);
  // endregion


  // region [Privates]
  /** 매 프레임 남은 시간을 읽음. 값이 바뀔 때만 상태를 올려 리렌더를 줄임. */
  const watchCooldown = useCallback((): (() => void) => {
    let frameId = 0;
    const tick = (): void => {
      const remaining = Math.max(0, inputSource.kickCooldownUntil - performance.now());
      setRemainingStep(Math.ceil((remaining / SPACE_KICK.cooldownMs) * RING_STEPS));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [inputSource]);
  // endregion


  // region [Events]
  const onPointerDownKick = useCallback(
    (pointerEvent: React.PointerEvent<HTMLButtonElement>): void => {
      // 조이스틱과 동시에 눌러도 이 손가락이 조이스틱 드래그로 안 넘어가게 함.
      pointerEvent.stopPropagation();
      inputSource.isKickRequested = true;
    },
    [inputSource],
  );
  // endregion


  // region [Life Cycles]
  useEffect(watchCooldown, [watchCooldown]);
  // endregion

  const isCoolingDown = remainingStep > 0;

  return (
    <button
      type="button"
      aria-label={isCoolingDown ? "발차기 준비 중" : "발차기"}
      aria-disabled={isCoolingDown}
      className={`absolute flex items-center justify-center rounded-full border backdrop-blur-sm touch-none select-none transition-colors ${
        isCoolingDown ? "border-white/10 bg-white/5" : "border-white/20 bg-white/10 active:border-bitcoin/70 active:bg-bitcoin/35"
      }`}
      style={{
        width: BUTTON_DIAMETER,
        height: BUTTON_DIAMETER,
        right: RIGHT_OFFSET,
        bottom: BOTTOM_OFFSET,
      }}
      onPointerDown={onPointerDownKick}
    >
      <Footprints
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
        className={isCoolingDown ? "text-white/35" : "text-white/85"}
        aria-hidden="true"
      />
      {isCoolingDown && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -rotate-90"
          viewBox={`0 0 ${BUTTON_DIAMETER} ${BUTTON_DIAMETER}`}
        >
          <circle
            cx={BUTTON_DIAMETER / 2}
            cy={BUTTON_DIAMETER / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="rgb(var(--bitcoin-rgb))"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - remainingStep / RING_STEPS)}
          />
        </svg>
      )}
    </button>
  );
}

const MemoizedKickButton = memo(KickButton);
MemoizedKickButton.displayName = "KickButton";

export default MemoizedKickButton;
