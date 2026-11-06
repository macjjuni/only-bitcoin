"use client";

import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import { SPACE_KICK } from "@/entities/space";
import type { SpaceInputSource } from "../model/spaceInputSource";
import {
  KICK_BUTTON_POSITION,
  TOUCH_BUTTON_DIAMETER,
  TOUCH_BUTTON_ICON_SIZE,
} from "./touchButtonLayout";

const ICON_STROKE_WIDTH = 2.25;

interface KickIconProps {
  className: string;
}

/**
 * 차는 부츠 아이콘. 앞으로 기운 부츠 뒤에 속도선을 붙였음.
 *
 * 아이콘 세트에 발차기·부츠가 없어 직접 그림. 전에 쓴 발자국(Footprints)은 걷기로
 * 읽혔음. 다른 버튼 아이콘(lucide)과 같은 24 격자·선 굵기·둥근 끝으로 맞춤.
 */
function KickIcon({ className }: KickIconProps): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width={TOUCH_BUTTON_ICON_SIZE}
      height={TOUCH_BUTTON_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <g transform="rotate(-28 13 12)">
        <path d="M10 3h5v8.5l4.2 2.1a2 2 0 0 1 1.1 1.8V18H10z" />
        <path d="M10 15h4" />
      </g>
      <path d="M2.5 9.5h3.5M2 13.5h4.5M3 17.5h3" />
    </svg>
  );
}
/** 테두리 안쪽에 그림. 선 굵기(2.5)만큼 지름에서 뺌. */
const RING_RADIUS = TOUCH_BUTTON_DIAMETER / 2 - 2;
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
        width: TOUCH_BUTTON_DIAMETER,
        height: TOUCH_BUTTON_DIAMETER,
        ...KICK_BUTTON_POSITION,
      }}
      onPointerDown={onPointerDownKick}
    >
      <KickIcon className={isCoolingDown ? "text-white/35" : "text-white/85"} />
      {isCoolingDown && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -rotate-90"
          viewBox={`0 0 ${TOUCH_BUTTON_DIAMETER} ${TOUCH_BUTTON_DIAMETER}`}
        >
          <circle
            cx={TOUCH_BUTTON_DIAMETER / 2}
            cy={TOUCH_BUTTON_DIAMETER / 2}
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
