"use client";

import {
  ArrowLeft,
  CircleHelp,
  MessageCircle,
  Music,
  PartyPopper,
  Pencil,
  Share2,
  UserRound,
  VolumeX,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveChatNickname } from "@/features/chat-session";
import type { SpaceBgm } from "@/features/space-bgm";
import {
  JumpButton,
  KickButton,
  type SpaceInputSource,
  shouldIgnoreSpaceHotkey,
  TOUCH_BUTTON_BOTTOM_OFFSET,
  TOUCH_BUTTON_EDGE,
  TOUCH_BUTTON_ICON_SIZE,
  useCoarsePointer,
  VirtualJoystick,
} from "@/features/space-controls";
import { useSpaceSessionContext, useSpaceSessionState } from "@/features/space-session";
import { env } from "@/shared/config/env";
import { DonationQrDialog, LightningIcon } from "@/shared/ui";
import type { SpacePerformanceSummary } from "@/views/space/lib/performanceSample";
import { useDismissOnOutsidePointer } from "@/views/space/lib/useDismissOnOutsidePointer";
import SpaceActionBar, { type SpaceHudAction } from "./SpaceActionBar";
import SpaceAvatarPicker from "./SpaceAvatarPicker";
import SpaceBaristaMenu from "./SpaceBaristaMenu";
import SpaceBossHud from "./SpaceBossHud";
import { SPACE_CHAT_INPUT_ID } from "./SpaceChatComposer";
import SpaceChatPanel from "./SpaceChatPanel";
import SpaceControlGuide from "./SpaceControlGuide";
import SpaceKeyboardChatBar from "./SpaceKeyboardChatBar";
import SpaceNicknameEditor from "./SpaceNicknameEditor";
import SpaceOccupantBadge from "./SpaceOccupantBadge";
import SpacePerformancePanel from "./SpacePerformancePanel";
import SpaceShareDialog from "./SpaceShareDialog";

/** 히스토리가 없을 때(직접 링크 진입) 돌아갈 곳. `/space` 를 노출하는 목록임. */
const FALLBACK_BACK_PATH = "/orange";

/** 설정 화면 개발자 후원과 같은 라이트닝 주소. 비어 있으면 후원 버튼을 숨김. */
const DONATION_LIGHTNING_ADDRESS = env.NEXT_PUBLIC_DONATION_ADDRESS;

/**
 * 우측 상단 버튼의 아이콘 크기. 손가락 기기가 기준이고 데스크톱은 한 단계 큼.
 *
 * 데스크톱은 화면이 넓고 멀리서 봐서, 폰 크기 그대로면 버튼·글자가 작아 보였음.
 * 좌측 상단 접속 표시와 좌측 하단 채팅창도 같은 이유로 데스크톱 크기를 따로 둠.
 */
const ICON_SIZE = { coarse: 18, fine: 22 } as const;
const ICON_STROKE_WIDTH = 2;
/** 모바일 채팅 버튼 아이콘. 점프·발차기 버튼 아이콘과 같은 크기. */
const MOBILE_CHAT_ICON_SIZE = TOUCH_BUTTON_ICON_SIZE;

const resolveBgmIcon = (bgm: SpaceBgm, iconSize: number): ReactNode => {
  return bgm.isPlaying ? (
    <Music size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />
  ) : (
    <VolumeX size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />
  );
};

interface SpaceHudProps {
  bgm: SpaceBgm;
  canTestCelebration: boolean;
  onCelebrate: () => void;
  inputSource: SpaceInputSource;
  nickname: string;
  /** 지금 쓰는 아바타 모델. 서버가 확정한 값이 우선함. */
  modelIndex: number;
  onChangeModel: (modelIndex: number) => Promise<boolean>;
  /** 계측 패널에 띄울 렌더 통계. 조작 안내 창에서 "성능 표시" 를 켰을 때만 값이 있음. */
  performanceSummary: SpacePerformanceSummary | null;
  isPerformanceStatsEnabled: boolean;
  onTogglePerformanceStats: () => void;
  dummyCount: number;
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
function SpaceHud({ bgm, canTestCelebration, inputSource, nickname, modelIndex, onChangeModel, onCelebrate, performanceSummary, isPerformanceStatsEnabled, onTogglePerformanceStats, dummyCount }: SpaceHudProps): ReactNode {
  // region [Hooks]
  const router = useTransitionRouter();
  const pathname = usePathname();
  const isCoarsePointer = useCoarsePointer();
  const session = useSpaceSessionContext();
  const presence = useSpaceSessionState((snapshot) => snapshot.presence);
  const messages = useSpaceSessionState((snapshot) => snapshot.messages);
  const sessionError = useSpaceSessionState((snapshot) => snapshot.error);
  const isMessagePending = useSpaceSessionState((snapshot) => snapshot.isMessagePending);
  const isNicknamePending = useSpaceSessionState((snapshot) => snapshot.isNicknamePending);
  const iconSize = isCoarsePointer ? ICON_SIZE.coarse : ICON_SIZE.fine;
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  /** 손가락 기기에서 키보드 위 입력 막대에 포커스가 있는 동안. */
  const [isComposingChat, setIsComposingChat] = useState(false);
  /** 바깥을 누르면 닫는 패널들. 패널 안을 누른 건지 가르는 데 씀. */
  const nicknameEditorRef = useRef<HTMLDivElement>(null);
  const avatarPickerRef = useRef<HTMLDivElement>(null);
  // endregion


  // region [Events]
  const onClickTestCelebration = useCallback((): void => {
    onCelebrate();
  }, [onCelebrate]);

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

  /**
   * 바깥을 눌러 닫을 때. 닫기 버튼과 달리 포커스를 여는 버튼으로 돌리지 않음. 화면을
   * 누른 사람에게 버튼 포커스 테두리가 갑자기 생기면 어색함.
   */
  const onDismissAvatarPicker = useCallback((): void => {
    setIsAvatarPickerOpen(false);
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

  /** 바깥을 눌러 닫을 때. 아바타 선택 창과 같은 이유로 포커스를 옮기지 않음. */
  const onDismissNicknameEditor = useCallback((): void => {
    setIsNicknameEditorOpen(false);
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
  // 여는 버튼은 빼야 열린 상태에서 그 버튼을 눌렀을 때 닫혔다 다시 열리지 않음.
  useDismissOnOutsidePointer(avatarPickerRef, isAvatarPickerOpen, onDismissAvatarPicker, [
    "space-avatar-toggle",
  ]);
  useDismissOnOutsidePointer(nicknameEditorRef, isNicknameEditorOpen, onDismissNicknameEditor, [
    "space-nickname-toggle",
  ]);

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
        icon: <ArrowLeft size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />,
        onClick: onClickBack,
      },
    ];

    if (DONATION_LIGHTNING_ADDRESS) {
      actions.push({
        id: "space-donation-toggle",
        label: "개발자 후원",
        icon: <LightningIcon size={iconSize} />,
        isActive: isDonationOpen,
        onClick: onClickOpenDonation,
      });
    }

    actions.push({
      id: "space-nickname-toggle",
      label: "닉네임 변경",
      icon: <Pencil size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isNicknameEditorOpen,
      onClick: onClickToggleNicknameEditor,
    });

    actions.push({
      id: "space-avatar-toggle",
      label: "아바타 변경",
      icon: <UserRound size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isAvatarPickerOpen,
      onClick: onClickToggleAvatarPicker,
    });

    actions.push({
      id: "space-share-toggle",
      label: "공유하기",
      icon: <Share2 size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />,
      isActive: isShareOpen,
      onClick: onClickOpenShare,
    });

    // 음원을 못 받는 환경에서는 눌러도 소리가 나지 않으므로 버튼을 내림.
    if (!bgm.isUnavailable) {
      actions.push({
        id: "space-bgm-toggle",
        label: bgm.isPlaying ? "배경음악 끄기" : "배경음악 켜기",
        icon: resolveBgmIcon(bgm, iconSize),
        isActive: bgm.isPlaying,
        onClick: bgm.toggle,
      });
    }

    if (canTestCelebration) {
      actions.push({
      id: "space-celebration-test",
      label: "전광판 폭죽 테스트",
      icon: <PartyPopper size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />,
      onClick: onClickTestCelebration,
      });
    }

    actions.push({
      id: "guide",
      label: "조작 안내",
      icon: <CircleHelp size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />,
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
    bgm.isPlaying,
    bgm.isUnavailable,
    bgm.toggle,
    iconSize,
    onClickTestCelebration,
    canTestCelebration,
  ]);

  const NicknameEditorTemplate = isNicknameEditorOpen ? (
    <div ref={nicknameEditorRef} className={`pointer-events-auto absolute top-24 ${isCoarsePointer ? "right-12" : "right-14"}`}>
      <SpaceNicknameEditor
        nickname={nickname}
        error={sessionError}
        isNicknamePending={isNicknamePending}
        changeNickname={onSubmitNickname}
        onClose={onClickCloseNicknameEditor}
      />
    </div>
  ) : null;

  const AvatarPickerTemplate = isAvatarPickerOpen ? (
    <div ref={avatarPickerRef} className={`pointer-events-auto absolute top-24 ${isCoarsePointer ? "right-12" : "right-14"}`}>
      <SpaceAvatarPicker
        modelIndex={modelIndex}
        onChangeModel={onChangeModel}
        onClose={onClickCloseAvatarPicker}
      />
    </div>
  ) : null;

  const GuidePanelTemplate = isGuideOpen ? (
    <div className="mt-2">
      <SpaceControlGuide
        isCoarsePointer={isCoarsePointer}
        isPerformanceStatsEnabled={isPerformanceStatsEnabled}
        onTogglePerformanceStats={onTogglePerformanceStats}
      />
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
      {/* 맨 아래에 깖. 사망 화면이 떠도 우측 상단 버튼(뒤로 가기 등)은 눌려야 함. */}
      <SpaceBossHud isCoarsePointer={isCoarsePointer} />

      {/* z-[31]: 씬 위에 뜨는 이름표·말풍선·피해 숫자(z 20 ~ 30)가 대화 내역을 가리지 않게 함. */}
      <div
        className="absolute left-4 top-4 z-[31]"
        style={{
          left: "calc(1rem + env(safe-area-inset-left))",
          top: "calc(1rem + env(safe-area-inset-top))",
        }}
      >
        {/* 데스크톱은 같은 자리에 인원수만 띄움. 대화 내역은 좌측 하단에 있음. */}
        {!isCoarsePointer && <SpaceOccupantBadge presence={presence} />}

        {/* 손가락 기기는 접속 표시를 겸한 대화 내역을 좌측 상단에 늘 띄움. 오류도 그 안에서 보여줌. */}
        {isCoarsePointer && (
          <div>
            <SpaceChatPanel
              messages={messages}
              presence={presence}
              error={sessionError}
              isMessagePending={isMessagePending}
              sendMessage={session.sendMessage}
              onRetry={session.retry}
              hasComposer={false}
              height={112}
              className="w-[min(260px,calc(100vw-5.5rem))]"
            />
          </div>
        )}

        {/* 계측 패널은 위 요소 바로 아래에 붙임. 채팅 내역을 접으면 같이 올라감. */}
        {performanceSummary && (
          <SpacePerformancePanel
            summary={performanceSummary}
            dummyCount={dummyCount}
            getNetworkStats={session.getNetworkStats}
            probeNetwork={session.probeNetwork}
          />
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
          <SpaceActionBar actions={hudActions} size={isCoarsePointer ? "default" : "desktop"} />
        </div>

        {NicknameEditorTemplate}

        {AvatarPickerTemplate}

        {/* 안내는 스위치 한 줄만 빼고 읽기 전용임. 터치를 통째로 막으면 열어둔 동안 그 영역의 시야 조작이 죽음. */}
        {GuidePanelTemplate}
      </div>

      {TouchControlsTemplate}

      {/* 손가락 기기 전용 좌측 하단 채팅 버튼. 조이스틱 반대쪽 엄지 자리임. */}
      {shouldRenderTouchControls && (
        <div
          className="pointer-events-auto absolute"
          style={{
            left: `calc(${TOUCH_BUTTON_EDGE} + env(safe-area-inset-left))`,
            bottom: TOUCH_BUTTON_BOTTOM_OFFSET,
          }}
        >
          <SpaceActionBar actions={[mobileChatAction]} align="start" size="large" />
        </div>
      )}

      {isCoarsePointer && (
        <SpaceKeyboardChatBar
          presence={presence}
          isMessagePending={isMessagePending}
          sendMessage={session.sendMessage}
          onComposingChange={setIsComposingChat}
        />
      )}

      {/* 글을 치거나 다른 창을 연 동안에는 내림. 키보드에 가려지고 조작이 겹침. */}
      {!isComposingChat && !isDonationOpen && !isShareOpen && (
        <SpaceBaristaMenu
          isCoarsePointer={isCoarsePointer}
          onCelebrate={onCelebrate}
        />
      )}

      {isShareOpen && <SpaceShareDialog onClose={onClickCloseShare} />}

      <DonationQrDialog
        lightningAddress={DONATION_LIGHTNING_ADDRESS}
        isOpen={isDonationOpen}
        onClose={onClickCloseDonation}
        returnFocusID="space-donation-toggle"
      />

      {/* 데스크톱은 접속 표시를 겸한 대화창을 좌측 하단에 늘 띄움. */}
      {!isCoarsePointer && (
        <div
          className="absolute z-[31]"
          style={{
            left: "calc(1rem + env(safe-area-inset-left))",
            bottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <SpaceChatPanel
            messages={messages}
            presence={presence}
            error={sessionError}
            isMessagePending={isMessagePending}
            sendMessage={session.sendMessage}
            onRetry={session.retry}
            hasComposer
            isDesktopSized
            messageTextClassName="text-base"
            height={320}
            className="w-[460px] max-w-[calc(100vw-2rem)]"
          />
        </div>
      )}
    </div>
  );
}

const MemoizedSpaceHud = memo(SpaceHud);
MemoizedSpaceHud.displayName = "SpaceHud";

export default MemoizedSpaceHud;
