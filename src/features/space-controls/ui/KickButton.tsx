"use client";

import { Swords } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import type { SpaceInputSource } from "../model/spaceInputSource";
import {
  KICK_BUTTON_POSITION,
  TOUCH_BUTTON_DIAMETER,
  TOUCH_BUTTON_ICON_SIZE,
  TOUCH_BUTTON_IDLE_CLASS,
  TOUCH_BUTTON_PRESSED_CLASS,
  TOUCH_BUTTON_SURFACE_CLASS,
} from "./touchButtonLayout";

const ICON_STROKE_WIDTH = 2.25;

/** 쿨다운 고리 굵기(px). */
const RING_STROKE_WIDTH = 3;
/** 테두리 안쪽에 그림. 선 굵기만큼 지름에서 뺌. */
const RING_RADIUS = TOUCH_BUTTON_DIAMETER / 2 - RING_STROKE_WIDTH / 2 - 0.5;
/** 누른 모습을 보여 주는 시간(ms). 누른 순간 한 번만 나가는 동작이라 짧게 번쩍임. */
const PRESS_FLASH_MS = 140;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
/** 남은 비율을 이 단위로 끊어 상태를 바꿈. 매 프레임 리렌더하지 않게 함. */
const RING_STEPS = 60;

interface KickButtonProps {
  inputSource: SpaceInputSource;
}

/**
 * 손가락 기기 전용 공격 버튼. 캐릭터마다 무기가 달라 아이콘은 무기가 아니라 공격을 뜻하는 것으로 씀.
 *
 * 처음엔 발차기였어서 코드·프로토콜 이름은 kick 으로 남아 있음. 이름을 바꾸면 배포된
 * 클라이언트·서버와 서로 못 알아들어 그대로 둠.
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
  const [isPressed, setIsPressed] = useState<boolean>(false);
  // endregion


  // region [Privates]
  /** 매 프레임 남은 시간을 읽음. 값이 바뀔 때만 상태를 올려 리렌더를 줄임. */
  const watchCooldown = useCallback((): (() => void) => {
    let frameId = 0;
    const tick = (): void => {
      const remaining = Math.max(0, inputSource.kickCooldownUntil - performance.now());
      setRemainingStep(Math.ceil((remaining / inputSource.kickCooldownMs) * RING_STEPS));
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
      setIsPressed(true);
    },
    [inputSource],
  );
  // endregion


  // region [Life Cycles]
  useEffect(watchCooldown, [watchCooldown]);

  useEffect(() => {
    if (!isPressed) {
      return;
    }
    const timeoutID = window.setTimeout(() => {
      setIsPressed(false);
    }, PRESS_FLASH_MS);

    return () => {
      window.clearTimeout(timeoutID);
    };
  }, [isPressed]);
  // endregion

  const isCoolingDown = remainingStep > 0;

  /** 누른 순간 → 쿨다운 → 평소 순으로 겉모양을 고름. */
  const resolveSurfaceClassName = (): string => {
    if (isPressed) {
      return TOUCH_BUTTON_PRESSED_CLASS;
    }

    return isCoolingDown ? "border-white/10 bg-black/35" : TOUCH_BUTTON_IDLE_CLASS;
  };

  return (
    <button
      type="button"
      aria-label={isCoolingDown ? "공격 준비 중" : "공격"}
      aria-disabled={isCoolingDown}
      className={`${TOUCH_BUTTON_SURFACE_CLASS} ${resolveSurfaceClassName()}`}
      style={{
        width: TOUCH_BUTTON_DIAMETER,
        height: TOUCH_BUTTON_DIAMETER,
        ...KICK_BUTTON_POSITION,
      }}
      onPointerDown={onPointerDownKick}
    >
      <Swords
        size={TOUCH_BUTTON_ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
        className={isCoolingDown && !isPressed ? "text-white/35" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"}
        aria-hidden="true"
      />
      {isCoolingDown && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -rotate-90"
          viewBox={`0 0 ${TOUCH_BUTTON_DIAMETER} ${TOUCH_BUTTON_DIAMETER}`}
        >
          {/* 고리가 채워질 자리. 남은 양을 가늠하기 쉬움. */}
          <circle
            cx={TOUCH_BUTTON_DIAMETER / 2}
            cy={TOUCH_BUTTON_DIAMETER / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={RING_STROKE_WIDTH}
          />
          <circle
            cx={TOUCH_BUTTON_DIAMETER / 2}
            cy={TOUCH_BUTTON_DIAMETER / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="rgb(var(--bitcoin-rgb))"
            strokeWidth={RING_STROKE_WIDTH}
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
