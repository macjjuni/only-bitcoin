"use client";

import { ArrowLeft, CircleHelp, MessageCircle, Pencil, Share2, UserRound, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { saveChatNickname } from "@/features/chat-session";
import {
  JumpButton,
  KickButton,
  type SpaceInputSource,
  shouldIgnoreSpaceHotkey,
  useCoarsePointer,
  VirtualJoystick,
} from "@/features/space-controls";
import type { SpaceSession } from "@/features/space-session";
import { env } from "@/shared/config/env";
import SpaceActionBar, { type SpaceHudAction } from "./SpaceActionBar";
import SpaceAvatarPicker from "./SpaceAvatarPicker";
import { SPACE_CHAT_INPUT_ID } from "./SpaceChatComposer";
import SpaceChatPanel from "./SpaceChatPanel";
import SpaceControlGuide from "./SpaceControlGuide";
import SpaceDonationDialog from "./SpaceDonationDialog";
import SpaceKeyboardChatBar from "./SpaceKeyboardChatBar";
import SpaceNicknameEditor from "./SpaceNicknameEditor";
import SpaceOccupantBadge from "./SpaceOccupantBadge";
import SpaceShareDialog from "./SpaceShareDialog";

/** 히스토리가 없을 때(직접 링크 진입) 돌아갈 곳. `/space` 를 노출하는 목록임. */
const FALLBACK_BACK_PATH = "/orange";

/** 설정 화면 개발자 후원과 같은 라이트닝 주소. 비어 있으면 후원 버튼을 숨김. */
const DONATION_LIGHTNING_ADDRESS = env.NEXT_PUBLIC_DONATION_ADDRESS;

const ICON_SIZE = 18;
const ICON_STROKE_WIDTH = 2;
/** 모바일 채팅 버튼 아이콘. 버튼을 48 px 로 키운 만큼 같이 키웠음. */
const MOBILE_CHAT_ICON_SIZE = 22;

interface SpaceHudProps {
  inputSource: SpaceInputSource;
  session: SpaceSession;
  nickname: string;
  /** 지금 쓰는 아바타 모델. 서버가 확정한 값이 우선함. */
  modelIndex: number;
  onChangeModel: (modelIndex: number) => Promise<boolean>;
}

/**
 * 캔버스 위에 떠 있는 2D 조작 레이어.
 *
 * 접속 표시는 대화 내역 맨 위 줄에 함께 둠(모바일 좌측 상단, 데스크톱 좌측 하단). 우측 상단은 버튼 묶음임. 안내와 상태를 DOM 으로
 * 제공함. 캔버스 안 텍스트에만 의존하면 확대·스크린리더·WebGL 실패 상황에서
 * 모두 읽히지 않음.
 *
 * 노치와 둥근 모서리를 피하려고 `safe-area-inset` 만큼 안쪽으로 들임.
 * 전체 화면 3D 페이지라 브라우저가 대신 비켜주지 않음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceHud({ inputSource, session, nickname, modelIndex, onChangeModel }: SpaceHudProps): ReactNode {
  // region [Hooks]
  const router = useTransitionRouter();
  const pathname = usePathname();
  const isCoarsePointer = useCoarsePointer();
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  /** 손가락 기기에서 키보드 위 입력 막대에 포커스가 있는 동안. */
  const [isComposingChat, setIsComposingChat] = useState(false);
  // endregion


  // region [Events]
  const onClickBack = useCallback((): void => {
    // 직접 링크로 들어온 경우 뒤로 갈 곳이 없어 빈 화면에 남음.
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(FALLBACK_BACK_PATH);
  }, [router]);

  const onClickToggleGuide = useCallback((): void => {
    setIsNicknameEditorOpen(false);
    setIsAvatarPickerOpen(false);
    setIsGuideOpen((previousOpen) => !previousOpen);
  }, []);

  const onClickOpenDonation = useCallback((): void => {
    setIsGuideOpen(false);
    setIsNicknameEditorOpen(false);
    setIsAvatarPickerOpen(false);
    setIsShareOpen(false);
    setIsDonationOpen(true);
  }, []);

  const onClickOpenShare = useCallback((): void => {
    setIsGuideOpen(false);
    setIsNicknameEditorOpen(false);
    setIsAvatarPickerOpen(false);
    setIsDonationOpen(false);
    setIsShareOpen(true);
  }, []);

  /** 닫은 뒤 포커스를 연 버튼으로 돌려줌. 키보드 사용자가 자리를 잃지 않게. */
  const onClickCloseShare = useCallback((): void => {
    setIsShareOpen(false);
    document.getElementById("space-share-toggle")?.focus();
  }, []);

  /**
   * 손가락 기기의 채팅 버튼. 입력 막대에 바로 포커스해 키보드를 올림.
   *
   * iOS 는 탭 처리 안에서 동기로 `focus()` 해야 키보드를 띄우므로 상태를 거치지 않음.
   */
  const onClickComposeChat = useCallback((): void => {
    setIsNicknameEditorOpen(false);
    setIsAvatarPickerOpen(false);
    document.getElementById(SPACE_CHAT_INPUT_ID)?.focus();
  }, []);

  const onClickCloseDonation = useCallback((): void => {
    setIsDonationOpen(false);
    document.getElementById("space-donation-toggle")?.focus();
  }, []);

  const onClickToggleAvatarPicker = useCallback((): void => {
    setIsGuideOpen(false);
    setIsNicknameEditorOpen(false);
    setIsAvatarPickerOpen((previousOpen) => !previousOpen);
  }, []);

  const onClickCloseAvatarPicker = useCallback((): void => {
    setIsAvatarPickerOpen(false);
    document.getElementById("space-avatar-toggle")?.focus();
  }, []);

  const onClickToggleNicknameEditor = useCallback((): void => {
    setIsGuideOpen(false);
    setIsAvatarPickerOpen(false);
    setIsNicknameEditorOpen((previousOpen) => !previousOpen);
  }, []);

  const onClickCloseNicknameEditor = useCallback((): void => {
    setIsNicknameEditorOpen(false);
    document.getElementById("space-nickname-toggle")?.focus();
  }, []);

  /** 서버가 받아들인 이름만 저장함. 채팅 위젯과 같은 저장소를 씀. */
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
  // endregion


  // region [Privates]
  /**
   * 데스크톱에서 Enter 로 대화 입력칸에 들어감.
   *
   * 손가락 기기에는 물리 키보드가 없음. 입력창·버튼에 포커스가 있을 때는
   * 흘려보냄. 글자를 치는 중이면 그 키는 입력창 몫이고, 버튼이면 브라우저가
   * 기본 활성화를 처리함. 모달이 떠 있으면 뒤에 가려진 입력칸으로 들어가지 않게 함.
   */
  const attachChatHotkey = useCallback((): (() => void) | undefined => {
    if (isCoarsePointer || isDonationOpen || isShareOpen) {
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
      document.getElementById(SPACE_CHAT_INPUT_ID)?.focus();
    };

    window.addEventListener("keydown", onKeyDownWindow);

    return () => {
      window.removeEventListener("keydown", onKeyDownWindow);
    };
  }, [isCoarsePointer, isDonationOpen, isShareOpen]);
  // endregion


  // region [Life Cycles]
  useEffect(attachChatHotkey, [attachChatHotkey]);
  // endregion


  // region [Templates]
  const mobileChatAction = useMemo((): SpaceHudAction => {
    return {
      id: "space-chat-compose",
      label: "메시지 입력",
      icon: <MessageCircle size={MOBILE_CHAT_ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      onClick: onClickComposeChat,
    };
  }, [onClickComposeChat]);
  const hudActions = useMemo((): SpaceHudAction[] => {
    const actions: SpaceHudAction[] = [
      {
        id: "back",
        label: "뒤로 가기",
        icon: <ArrowLeft size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
        onClick: onClickBack,
      },
    ];

    if (DONATION_LIGHTNING_ADDRESS) {
      actions.push({
        id: "space-donation-toggle",
        label: "개발자 후원",
        icon: <Zap size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
        isActive: isDonationOpen,
        onClick: onClickOpenDonation,
      });
    }

    actions.push({
      id: "space-nickname-toggle",
      label: "닉네임 변경",
      icon: <Pencil size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isNicknameEditorOpen,
      onClick: onClickToggleNicknameEditor,
    });

    actions.push({
      id: "space-avatar-toggle",
      label: "아바타 변경",
      icon: <UserRound size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isAvatarPickerOpen,
      onClick: onClickToggleAvatarPicker,
    });

    actions.push({
      id: "space-share-toggle",
      label: "공유하기",
      icon: <Share2 size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isShareOpen,
      onClick: onClickOpenShare,
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
    isNicknameEditorOpen,
    onClickToggleNicknameEditor,
    isAvatarPickerOpen,
    onClickToggleAvatarPicker,
    isDonationOpen,
    onClickOpenDonation,
    isShareOpen,
    onClickOpenShare,
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

  const AvatarPickerTemplate = isAvatarPickerOpen ? (
    <div className="pointer-events-auto absolute right-12 top-24">
      <SpaceAvatarPicker
        modelIndex={modelIndex}
        onChangeModel={onChangeModel}
        onClose={onClickCloseAvatarPicker}
      />
    </div>
  ) : null;

  const GuidePanelTemplate = isGuideOpen ? (
    <div className="mt-2">
      <SpaceControlGuide isCoarsePointer={isCoarsePointer} />
    </div>
  ) : null;

  /**
   * 조이스틱과 점프 버튼은 손가락 기기에만 띄움. 마우스 환경에는 WASD·Space 가 있음.
   *
   * 채팅이나 닉네임 입력 중에는 둘 다 내려 키보드와 조작이 겹치지 않게 함.
   * 언마운트 정리가 눌려 있던 입력까지 0 으로 비움.
   */
  const shouldRenderTouchControls =
    isCoarsePointer &&
    !isNicknameEditorOpen &&
    !isAvatarPickerOpen &&
    !isDonationOpen &&
    !isShareOpen &&
    !isComposingChat;
  const TouchControlsTemplate =
    shouldRenderTouchControls ? (
      <div className="pointer-events-auto">
        <VirtualJoystick inputSource={inputSource} />
        <JumpButton inputSource={inputSource} />
        <KickButton inputSource={inputSource} />
      </div>
    ) : null;
  // endregion

  // 경로가 바뀌는 동안에도 HUD 가 남지 않도록 현재 경로를 키로 씀.
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
        {/* 데스크톱은 같은 자리에 인원수만 띄움. 대화 내역은 좌측 하단에 있음. */}
        {!isCoarsePointer && <SpaceOccupantBadge presence={session.presence} />}

        {/* 손가락 기기는 접속 표시를 겸한 대화 내역을 좌측 상단에 늘 띄움. 오류도 그 안에서 보여줌. */}
        {isCoarsePointer && (
          <div>
            <SpaceChatPanel
              messages={session.messages}
              presence={session.presence}
              error={session.error}
              isMessagePending={session.isMessagePending}
              sendMessage={session.sendMessage}
              onRetry={session.retry}
              hasComposer={false}
              height={112}
              className="w-[min(260px,calc(100vw-5.5rem))]"
            />
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

        {AvatarPickerTemplate}

        {/* 안내는 읽기 전용임. 터치를 막으면 열어둔 동안 그 영역의 시야 조작이 죽음. */}
        {GuidePanelTemplate}
      </div>

      {TouchControlsTemplate}

      {/* 손가락 기기 전용 좌측 하단 채팅 버튼. 조이스틱 반대쪽 엄지 자리임. */}
      {shouldRenderTouchControls && (
        <div
          className="pointer-events-auto absolute"
          style={{
            left: "calc(1.5rem + env(safe-area-inset-left))",
            bottom: "calc(4.5rem + env(safe-area-inset-bottom))",
          }}
        >
          <SpaceActionBar actions={[mobileChatAction]} align="start" size="large" />
        </div>
      )}

      {isCoarsePointer && (
        <SpaceKeyboardChatBar
          presence={session.presence}
          isMessagePending={session.isMessagePending}
          sendMessage={session.sendMessage}
          onComposingChange={setIsComposingChat}
        />
      )}

      {isShareOpen && <SpaceShareDialog onClose={onClickCloseShare} />}

      {isDonationOpen && (
        <SpaceDonationDialog lightningAddress={DONATION_LIGHTNING_ADDRESS} onClose={onClickCloseDonation} />
      )}

      {/* 데스크톱은 접속 표시를 겸한 대화창을 좌측 하단에 늘 띄움. */}
      {!isCoarsePointer && (
        <div
          className="absolute"
          style={{
            left: "calc(1rem + env(safe-area-inset-left))",
            bottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <SpaceChatPanel
            messages={session.messages}
            presence={session.presence}
            error={session.error}
            isMessagePending={session.isMessagePending}
            sendMessage={session.sendMessage}
            onRetry={session.retry}
            hasComposer
            messageTextClassName="text-sm"
            height={248}
            className="w-[400px] max-w-[calc(100vw-2rem)]"
          />
        </div>
      )}
    </div>
  );
}

const MemoizedSpaceHud = memo(SpaceHud);
MemoizedSpaceHud.displayName = "SpaceHud";

export default MemoizedSpaceHud;
