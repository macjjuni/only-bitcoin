"use client";

import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { SpacePresence } from "@/entities/space";
import SpaceChatComposer from "./SpaceChatComposer";

interface SpaceKeyboardChatBarProps {
  presence: SpacePresence;
  isMessagePending: boolean;
  sendMessage: (body: string) => Promise<boolean>;
  /** 입력 중인지 호출부에 알림. 입력 중에는 조이스틱·채팅 버튼을 내림. */
  onComposingChange: (isComposing: boolean) => void;
}

/**
 * 포커스가 빠진 뒤 막대를 숨기기까지 기다리는 시간.
 *
 * 보내기를 누르는 순간 기기에 따라 입력칸 포커스가 먼저 빠짐. 그때 막대를 바로
 * 숨기면(터치 통과로 바뀌면) 뒤따르는 클릭이 버튼에 닿지 않아 메시지가 안 나감.
 */
const HIDE_DELAY_AFTER_BLUR_MS = 200;

/**
 * 손가락 기기에서 키보드 바로 위에 붙는 입력 막대.
 *
 * 늘 렌더해 두고 포커스가 있을 때만 보임. iOS 는 사용자 탭 안에서 바로 `focus()` 해야
 * 키보드를 올림. 버튼을 누른 뒤 입력칸을 새로 만들면 이미 늦어서 키보드가 안 뜸.
 * 숨김은 투명도로만 함(`display: none` 이면 포커스를 받지 못함).
 *
 * 키보드 높이는 `visualViewport` 로 잼. `absolute` 의 `bottom: 0` 은 화면 맨 아래라
 * 키보드가 덮은 만큼 띄움. 일부 안드로이드는 키보드 없이도 1px 미만 오차가 남아
 * 문턱을 둠.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceKeyboardChatBar({ presence, isMessagePending, sendMessage, onComposingChange }: SpaceKeyboardChatBarProps): ReactNode {
  // region [Hooks]
  const [isComposing, setIsComposing] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const hideTimerRef = useRef<number | null>(null);
  // endregion


  // region [Privates]
  const clearHideTimer = useCallback((): void => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startViewportTracking = useCallback((): (() => void) => {
    const visualViewport = window.visualViewport;
    const updateKeyboardInset = (): void => {
      const height = visualViewport?.height ?? window.innerHeight;
      setKeyboardInset(Math.max(0, window.innerHeight - height - (visualViewport?.offsetTop ?? 0)));
    };
    updateKeyboardInset();
    visualViewport?.addEventListener("resize", updateKeyboardInset);
    visualViewport?.addEventListener("scroll", updateKeyboardInset);
    window.addEventListener("resize", updateKeyboardInset);
    return () => {
      visualViewport?.removeEventListener("resize", updateKeyboardInset);
      visualViewport?.removeEventListener("scroll", updateKeyboardInset);
      window.removeEventListener("resize", updateKeyboardInset);
    };
  }, []);
  // endregion


  // region [Events]
  const onFocusComposer = useCallback((): void => {
    clearHideTimer();
    setIsComposing(true);
    onComposingChange(true);
  }, [clearHideTimer, onComposingChange]);

  const onBlurComposer = useCallback((): void => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setIsComposing(false);
      onComposingChange(false);
    }, HIDE_DELAY_AFTER_BLUR_MS);
  }, [clearHideTimer, onComposingChange]);
  // endregion


  // region [Life Cycles]
  useEffect(startViewportTracking, [startViewportTracking]);
  // 언마운트 뒤 타이머가 상태를 건드리지 않게 함.
  useEffect(() => clearHideTimer, [clearHideTimer]);
  // endregion


  // region [Templates]
  const isKeyboardOpen = keyboardInset > 1;
  // endregion

  return (
    <div
      className={`absolute inset-x-0 z-30 bg-black/70 px-2 pt-2 transition-opacity duration-150 ${isComposing ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      style={{
        bottom: keyboardInset,
        paddingBottom: isKeyboardOpen ? "0.5rem" : "calc(0.5rem + env(safe-area-inset-bottom))",
        paddingLeft: "calc(0.5rem + env(safe-area-inset-left))",
        paddingRight: "calc(0.5rem + env(safe-area-inset-right))",
      }}
    >
      <SpaceChatComposer presence={presence} isMessagePending={isMessagePending} sendMessage={sendMessage} onFocus={onFocusComposer} onBlur={onBlurComposer} />
    </div>
  );
}

export default memo(SpaceKeyboardChatBar);
