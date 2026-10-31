"use client";

import { ArrowLeft, CircleHelp, Maximize, MessageCircle, Minimize } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { memo, type ReactNode, useCallback, useMemo, useState } from "react";
import {
  type SpaceInputSource,
  useCoarsePointer,
  VirtualJoystick,
} from "@/features/space-controls";
import type { SpaceSession } from "@/features/space-session";
import SpaceActionBar, { type SpaceHudAction } from "./SpaceActionBar";
import SpaceChatPanel from "./SpaceChatPanel";
import SpaceControlGuide from "./SpaceControlGuide";
import SpacePresenceBadge from "./SpacePresenceBadge";
import { useFullscreen } from "./useFullscreen";

/** 히스토리가 없을 때(직접 링크 진입) 돌아갈 곳. `/space` 를 노출하는 목록이다. */
const FALLBACK_BACK_PATH = "/orange";

const ICON_SIZE = 18;
const ICON_STROKE_WIDTH = 2;

interface SpaceHudProps {
  inputSource: SpaceInputSource;
  session: SpaceSession;
  nickname: string;
}

/**
 * 캔버스 위에 떠 있는 2D 조작 레이어.
 *
 * 좌측 상단은 접속 표시, 우측 상단은 버튼 묶음이다. 안내와 상태를 DOM 으로
 * 제공한다. 캔버스 안 텍스트에만 의존하면 확대·스크린리더·WebGL 실패 상황에서
 * 모두 읽히지 않는다.
 *
 * 노치와 둥근 모서리를 피하려고 `safe-area-inset` 만큼 안쪽으로 들인다.
 * 전체 화면 3D 페이지라 브라우저가 대신 비켜주지 않는다.
 */
function SpaceHud({ inputSource, session, nickname }: SpaceHudProps): ReactNode {
  // region [Hooks]
  const router = useTransitionRouter();
  const pathname = usePathname();
  const { isFullscreen, isFullscreenSupported, toggleFullscreen } = useFullscreen();
  const isCoarsePointer = useCoarsePointer();
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [lastReadMessageID, setLastReadMessageID] = useState<string | null>(null);
  // endregion

  // region [Events]
  const onClickBack = useCallback((): void => {
    // 직접 링크로 들어온 경우 뒤로 갈 곳이 없어 빈 화면에 남는다.
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(FALLBACK_BACK_PATH);
  }, [router]);

  const onClickToggleGuide = useCallback((): void => {
    setIsGuideOpen((previousOpen) => !previousOpen);
  }, []);
  const onChangeChatFocus = useCallback(
    (isFocused: boolean): void => {
      setIsChatFocused(isFocused);
      if (isFocused) {
        inputSource.joystick.forward = 0;
        inputSource.joystick.strafe = 0;
        inputSource.joystick.isRunning = false;
      }
    },
    [inputSource],
  );

  const onClickCloseChat = useCallback((): void => {
    setLastReadMessageID(session.messages.at(-1)?.id ?? null);
    setIsChatOpen(false);
    setIsChatFocused(false);
    document.getElementById("space-chat-toggle")?.focus();
  }, [session.messages]);

  const onClickToggleChat = useCallback((): void => {
    setLastReadMessageID(session.messages.at(-1)?.id ?? null);
    setIsChatOpen((previous) => !previous);
  }, [session.messages]);
  // endregion

  // region [Templates]
  const lastReadIndex = session.messages.findIndex(({ id }) => id === lastReadMessageID);
  const unreadCount = isChatOpen ? 0 : session.messages.length - lastReadIndex - 1;
  const hudActions = useMemo((): SpaceHudAction[] => {
    const actions: SpaceHudAction[] = [
      {
        id: "back",
        label: "뒤로 가기",
        icon: <ArrowLeft size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
        onClick: onClickBack,
      },
    ];

    if (isFullscreenSupported) {
      actions.push({
        id: "fullscreen",
        label: isFullscreen ? "전체 화면 끄기" : "전체 화면",
        icon: isFullscreen ? (
          <Minimize size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Maximize size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        ),
        isActive: isFullscreen,
        onClick: toggleFullscreen,
      });
    }

    actions.push({
      id: "space-chat-toggle",
      label: isChatOpen ? "공간 채팅 닫기" : "공간 채팅 열기",
      icon: <MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isChatOpen,
      badgeCount: unreadCount,
      onClick: onClickToggleChat,
    });

    actions.push({
      id: "guide",
      label: "조작 안내",
      icon: <CircleHelp size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isGuideOpen,
      onClick: onClickToggleGuide,
    });

    return actions;
  }, [
    isChatOpen,
    unreadCount,
    onClickToggleChat,
    isFullscreen,
    isFullscreenSupported,
    isGuideOpen,
    onClickBack,
    onClickToggleGuide,
    toggleFullscreen,
  ]);

  const GuidePanelTemplate = isGuideOpen ? (
    <div className="mt-2">
      <SpaceControlGuide />
    </div>
  ) : null;

  /** 조이스틱은 손가락 기기에만 띄운다. 마우스 환경에는 WASD 가 있다. */
  const JoystickTemplate =
    isCoarsePointer && !isChatFocused ? (
      <div className="pointer-events-auto">
        <VirtualJoystick inputSource={inputSource} />
      </div>
    ) : null;
  // endregion

  // 경로가 바뀌는 동안에도 HUD 가 남지 않도록 현재 경로를 키로 쓴다.
  return (
    <div
      key={pathname}
      className="pointer-events-none absolute inset-0"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      <div
        className="absolute left-4 top-4"
        style={{
          left: "calc(1rem + env(safe-area-inset-left))",
          top: "calc(1rem + env(safe-area-inset-top))",
        }}
      >
        <SpacePresenceBadge presence={session.presence} />
        {session.error && !isChatOpen && (
          <div
            role="status"
            className="pointer-events-auto mt-2 max-w-[min(280px,calc(100vw-6rem))] rounded-xl border border-white/15 bg-[#10151f]/95 px-3 py-2 text-xs leading-relaxed text-white/75 shadow-lg backdrop-blur-xl"
          >
            <p>{session.error}</p>
            {session.presence.status === "offline" && session.isConnectionConfigured && (
              <button
                type="button"
                onClick={session.retry}
                className="mt-1.5 rounded py-1 text-bitcoin focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
              >
                다시 접속
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="absolute right-4 top-4 flex flex-col items-end"
        style={{
          right: "calc(1rem + env(safe-area-inset-right))",
          top: "calc(1rem + env(safe-area-inset-top))",
        }}
      >
        <div className="pointer-events-auto">
          <SpaceActionBar actions={hudActions} />
        </div>

        {/* 안내는 읽기 전용이다. 터치를 막으면 열어둔 동안 그 영역의 시야 조작이 죽는다. */}
        {GuidePanelTemplate}
      </div>

      {JoystickTemplate}

      {isChatOpen && (
        <SpaceChatPanel
          messages={session.messages}
          presence={session.presence}
          nickname={nickname}
          error={session.error}
          isMessagePending={session.isMessagePending}
          sendMessage={session.sendMessage}
          onClose={onClickCloseChat}
          onRetry={session.retry}
          onFocusChange={onChangeChatFocus}
        />
      )}
    </div>
  );
}

const MemoizedSpaceHud = memo(SpaceHud);
MemoizedSpaceHud.displayName = "SpaceHud";

export default MemoizedSpaceHud;
