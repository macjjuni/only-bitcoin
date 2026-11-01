"use client";

import { ArrowLeft, CircleHelp, MessageCircle, Pencil } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveChatNickname } from "@/features/chat-session";
import {
  JumpButton,
  type SpaceInputSource,
  shouldIgnoreSpaceHotkey,
  useCoarsePointer,
  VirtualJoystick,
} from "@/features/space-controls";
import type { SpaceSession } from "@/features/space-session";
import SpaceActionBar, { type SpaceHudAction } from "./SpaceActionBar";
import SpaceChatPanel, { SPACE_CHAT_INPUT_ID } from "./SpaceChatPanel";
import SpaceControlGuide from "./SpaceControlGuide";
import SpaceNicknameEditor from "./SpaceNicknameEditor";
import SpacePresenceBadge from "./SpacePresenceBadge";

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
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceHud({ inputSource, session, nickname }: SpaceHudProps): ReactNode {
  // region [Hooks]
  const router = useTransitionRouter();
  const pathname = usePathname();
  const isCoarsePointer = useCoarsePointer();
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [lastReadMessageID, setLastReadMessageID] = useState<string | null>(null);
  /** 단축키 리스너가 메시지마다 다시 붙지 않도록 최신 목록만 참조한다. */
  const messagesRef = useRef(session.messages);
  messagesRef.current = session.messages;
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
    setIsNicknameEditorOpen(false);
    setIsGuideOpen((previousOpen) => !previousOpen);
  }, []);

  const onClickToggleNicknameEditor = useCallback((): void => {
    setIsGuideOpen(false);
    setIsNicknameEditorOpen((previousOpen) => !previousOpen);
  }, []);

  const onClickCloseNicknameEditor = useCallback((): void => {
    setIsNicknameEditorOpen(false);
    document.getElementById("space-nickname-toggle")?.focus();
  }, []);

  const onClickCloseChat = useCallback((): void => {
    setLastReadMessageID(session.messages.at(-1)?.id ?? null);
    setIsChatOpen(false);
    document.getElementById("space-chat-toggle")?.focus();
  }, [session.messages]);

  /** 서버가 받아들인 이름만 저장한다. 채팅 위젯과 같은 저장소를 쓴다. */
  const onSubmitNickname = useCallback(
    async (nickname: string): Promise<boolean> => {
      const wasAccepted = await session.changeNickname(nickname);

      if (wasAccepted) {
        saveChatNickname(nickname.trim());
      }

      return wasAccepted;
    },
    [session.changeNickname],
  );

  const onClickToggleChat = useCallback((): void => {
    setIsNicknameEditorOpen(false);
    setLastReadMessageID(session.messages.at(-1)?.id ?? null);
    setIsChatOpen((previous) => !previous);
  }, [session.messages]);
  // endregion


  // region [Privates]
  /**
   * 데스크톱에서 Enter 로 채팅을 연다.
   *
   * 손가락 기기에는 물리 키보드가 없고, 자판이 올라오면 화면 절반을 덮는다.
   * 입력창·버튼에 포커스가 있을 때는 흘려보낸다. 글자를 치는 중이면 그 키는
   * 입력창 몫이고, 버튼이면 브라우저가 기본 활성화를 처리한다.
   */
  const attachChatHotkey = useCallback((): (() => void) | undefined => {
    if (isCoarsePointer) {
      return;
    }

    const onKeyDownWindow = (event: KeyboardEvent): void => {
      if (
        event.key !== "Enter" ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        shouldIgnoreSpaceHotkey(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setIsNicknameEditorOpen(false);
      setLastReadMessageID(messagesRef.current.at(-1)?.id ?? null);
      setIsChatOpen(true);
      // 이미 열려 있는데 캔버스를 클릭했다면 입력칸으로 되돌린다. 닫혀 있으면
      // 아직 패널이 없어 아무 일도 하지 않고, 패널이 뜰 때 스스로 포커스한다.
      document.getElementById(SPACE_CHAT_INPUT_ID)?.focus();
    };

    window.addEventListener("keydown", onKeyDownWindow);

    return () => {
      window.removeEventListener("keydown", onKeyDownWindow);
    };
  }, [isCoarsePointer]);
  // endregion


  // region [Life Cycles]
  useEffect(attachChatHotkey, [attachChatHotkey]);
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

    actions.push({
      id: "space-chat-toggle",
      label: isChatOpen ? "공간 채팅 닫기" : "공간 채팅 열기",
      icon: <MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isChatOpen,
      badgeCount: unreadCount,
      onClick: onClickToggleChat,
    });

    actions.push({
      id: "space-nickname-toggle",
      label: "닉네임 변경",
      icon: <Pencil size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isNicknameEditorOpen,
      onClick: onClickToggleNicknameEditor,
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
    isNicknameEditorOpen,
    onClickToggleNicknameEditor,
    isGuideOpen,
    onClickBack,
    onClickToggleGuide,
  ]);

  const NicknameEditorTemplate = isNicknameEditorOpen ? (
    <div className="pointer-events-auto absolute right-12 top-24">
      <SpaceNicknameEditor
        nickname={nickname}
        error={session.error}
        isNicknamePending={session.isNicknamePending}
        changeNickname={onSubmitNickname}
        onClose={onClickCloseNicknameEditor}
      />
    </div>
  ) : null;

  const GuidePanelTemplate = isGuideOpen ? (
    <div className="mt-2">
      <SpaceControlGuide />
    </div>
  ) : null;

  /**
   * 조이스틱과 점프 버튼은 손가락 기기에만 띄운다. 마우스 환경에는 WASD·Space 가 있다.
   *
   * 채팅이나 닉네임 입력 중에는 둘 다 내려 키보드와 조작이 겹치지 않게 한다.
   * 언마운트 정리가 눌려 있던 입력까지 0 으로 비운다.
   */
  const shouldRenderTouchControls = isCoarsePointer && !isChatOpen && !isNicknameEditorOpen;
  const TouchControlsTemplate =
    shouldRenderTouchControls ? (
      <div className="pointer-events-auto">
        <VirtualJoystick inputSource={inputSource} />
        <JumpButton inputSource={inputSource} />
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
        className="absolute right-4 top-4 z-40 flex flex-col items-end"
        style={{
          right: "calc(1rem + env(safe-area-inset-right))",
          top: "calc(1rem + env(safe-area-inset-top))",
        }}
      >
        <div className="pointer-events-auto">
          <SpaceActionBar actions={hudActions} />
        </div>

        {NicknameEditorTemplate}

        {/* 안내는 읽기 전용이다. 터치를 막으면 열어둔 동안 그 영역의 시야 조작이 죽는다. */}
        {GuidePanelTemplate}
      </div>

      {TouchControlsTemplate}

      {isChatOpen && (
        <SpaceChatPanel
          messages={session.messages}
          presence={session.presence}
          error={session.error}
          isMessagePending={session.isMessagePending}
          sendMessage={session.sendMessage}
          onClose={onClickCloseChat}
          onRetry={session.retry}
          isBottomSheet={isCoarsePointer}
          shouldAutoFocus={!isCoarsePointer}
        />
      )}
    </div>
  );
}

const MemoizedSpaceHud = memo(SpaceHud);
MemoizedSpaceHud.displayName = "SpaceHud";

export default MemoizedSpaceHud;
