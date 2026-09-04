"use client";

import { KButton, KTextField } from "kku-ui";
import { Check, Maximize2, Minimize2, Pencil, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/entities/chat-message";
import {
  type ChatIdentity,
  ChatTurnstile,
  useChatConnection,
  useChatStore,
} from "@/features/chat-session";
import { CHAT_MAX_NICKNAME_GRAPHEMES, chatConfig } from "@/shared/config/chat";
import { truncateGraphemes } from "@/shared/lib/text/countGraphemes";
import ChatComposer from "./ChatComposer";
import ChatMessageList from "./ChatMessageList";

interface ChatPanelProps {
  identity: ChatIdentity | null;
  hasAcceptedNotice: boolean;
  draft: string;
  selectedReply: ChatMessage | null;
  expandedMessageIds: ReadonlySet<string>;
  isMarketContextExpanded: boolean;
  savedScrollTop: number | null;
  pendingSayRequestId: string | null;
  onClose: () => void;
  onAcceptNotice: () => void;
  onChangeDraft: (draft: string) => void;
  onChangeSelectedReply: (message: ChatMessage | null) => void;
  onToggleMessageExpanded: (messageId: string) => void;
  onToggleMarketContext: () => void;
  onChangeSavedScrollTop: (scrollTop: number) => void;
  onChangePendingSayRequestId: (requestId: string | null) => void;
}

const focusableElementSelector = [
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function ChatPanel({
  identity,
  hasAcceptedNotice,
  draft,
  selectedReply,
  expandedMessageIds,
  isMarketContextExpanded,
  savedScrollTop,
  pendingSayRequestId,
  onClose,
  onAcceptNotice,
  onChangeDraft,
  onChangeSelectedReply,
  onToggleMessageExpanded,
  onToggleMarketContext,
  onChangeSavedScrollTop,
  onChangePendingSayRequestId,
}: ChatPanelProps) {
  // region [Hooks]
  const connectionStatus = useChatStore((chatState) => chatState.connectionStatus);
  const me = useChatStore((chatState) => chatState.me);
  const online = useChatStore((chatState) => chatState.online);
  const readOnly = useChatStore((chatState) => chatState.readOnly);
  const reasonCode = useChatStore((chatState) => chatState.reasonCode);
  const messagesById = useChatStore((chatState) => chatState.messagesById);
  const pendingSayRequest = useChatStore((chatState) => {
    return pendingSayRequestId ? chatState.pendingRequests[pendingSayRequestId] : undefined;
  });
  const isTurnstileRequired = useChatStore((chatState) => chatState.isTurnstileRequired);
  const announcement = useChatStore((chatState) => chatState.announcement);
  const [isMobilePanel, setIsMobilePanel] = useState(false);
  const [mobileViewportHeightInPixels, setMobileViewportHeightInPixels] = useState<number | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNicknameEditorOpen, setIsNicknameEditorOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(identity?.nickname ?? "익명");
  const panelReference = useRef<HTMLElement | null>(null);
  const closeButtonReference = useRef<HTMLButtonElement | null>(null);
  const verifyTurnstileReference = useRef<(turnstileToken: string) => string | null>(() => null);
  const isConnectionEnabled =
    hasAcceptedNotice && identity !== null && chatConfig.isConnectionConfigured;
  const {
    sendMessage,
    toggleReaction,
    changeNickname,
    requestMoreMessages,
    verifyTurnstileToken,
    retryConnection,
  } = useChatConnection({ isEnabled: isConnectionEnabled, identity });
  verifyTurnstileReference.current = verifyTurnstileToken;
  // endregion

  // region [Privates]
  const closePanel = (): void => {
    onClose();
  };

  const trapFocusInsideFullscreenPanel = (
    keyboardEvent: React.KeyboardEvent<HTMLElement>,
  ): void => {
    if (!isFullscreen || keyboardEvent.key !== "Tab" || !panelReference.current) {
      return;
    }

    const focusableElements = Array.from(
      panelReference.current.querySelectorAll<HTMLElement>(focusableElementSelector),
    );
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements.at(-1);

    if (!firstFocusableElement || !lastFocusableElement) {
      return;
    }

    if (keyboardEvent.shiftKey && document.activeElement === firstFocusableElement) {
      keyboardEvent.preventDefault();
      lastFocusableElement.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === lastFocusableElement) {
      keyboardEvent.preventDefault();
      firstFocusableElement.focus();
    }
  };

  const acknowledgeSentMessage = (): void => {
    onChangeDraft("");
    onChangeSelectedReply(null);
  };
  // endregion

  // region [Events]
  const onClickBackdrop = (): void => {
    closePanel();
  };

  const onClickCloseButton = (): void => {
    closePanel();
  };

  const onClickToggleFullscreenButton = (): void => {
    setIsFullscreen((currentFullscreenState) => !currentFullscreenState);
  };

  const onKeyDownPanel = (keyboardEvent: React.KeyboardEvent<HTMLElement>): void => {
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      closePanel();
      return;
    }

    trapFocusInsideFullscreenPanel(keyboardEvent);
  };

  const onClickAcceptNoticeButton = (): void => {
    onAcceptNotice();
  };

  const onClickNicknameEditButton = (): void => {
    setNicknameDraft(me?.nickname ?? identity?.nickname ?? "익명");
    setIsNicknameEditorOpen(true);
  };

  const onChangeNicknameInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setNicknameDraft(truncateGraphemes(event.target.value, CHAT_MAX_NICKNAME_GRAPHEMES));
  };

  const onClickNicknameSaveButton = (): void => {
    if (!nicknameDraft.trim()) {
      return;
    }

    const requestId = changeNickname(nicknameDraft);

    if (requestId) {
      setIsNicknameEditorOpen(false);
    }
  };

  const onClickRetryConnectionButton = (): void => {
    retryConnection();
  };

  const onSelectReplyMessage = (message: ChatMessage): void => {
    onChangeSelectedReply(message);
  };

  const onCancelReplyMessage = (): void => {
    onChangeSelectedReply(null);
  };

  const onVerifyTurnstileToken = useCallback((turnstileToken: string): void => {
    verifyTurnstileReference.current(turnstileToken);
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    closeButtonReference.current?.focus();
  }, []);

  useEffect(() => {
    const mobileMediaQuery = window.matchMedia("(max-width: 639px)");
    const updateMobilePanelState = (): void => {
      setIsMobilePanel(mobileMediaQuery.matches);
    };

    updateMobilePanelState();
    mobileMediaQuery.addEventListener("change", updateMobilePanelState);

    return () => {
      mobileMediaQuery.removeEventListener("change", updateMobilePanelState);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const previousOverflowValue = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflowValue;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateVisualViewportHeight = (): void => {
      setMobileViewportHeightInPixels(visualViewport?.height ?? window.innerHeight);
    };

    updateVisualViewportHeight();
    visualViewport?.addEventListener("resize", updateVisualViewportHeight);

    return () => {
      visualViewport?.removeEventListener("resize", updateVisualViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (selectedReply && !messagesById[selectedReply.id]) {
      onChangeSelectedReply(null);
    }
  }, [messagesById, onChangeSelectedReply, selectedReply]);
  // endregion

  // region [Templates]
  const connectionStatusLabel = (() => {
    switch (connectionStatus) {
      case "open":
        return "연결됨";
      case "readOnly":
        return "읽기 전용";
      case "offline":
        return "오프라인";
      case "connecting":
        return "연결 중";
      case "reconnecting":
        return "재연결 중";
      case "idle":
        return "연결 안 됨";
      default:
        return "연결 안 됨";
    }
  })();

  const NoticeTemplate = !hasAcceptedNotice ? (
    <div className="flex min-h-0 flex-1 items-center justify-center p-5">
      <section className="rounded-3xl border border-bitcoin/25 bg-bitcoin/5 p-5">
        <p className="text-sm font-bold">채팅 이용 전 확인해 주세요</p>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-xs leading-5 text-neutral-600 dark:text-neutral-300">
          <li>공개 글은 기간 제한 없이 최근 300개까지 보관됩니다.</li>
          <li>개인정보, 연락처, 링크를 작성하지 마세요.</li>
          <li>투자 권유, 리딩방 홍보, 사칭과 도배를 금지합니다.</li>
          <li>메시지는 Cloudflare 인프라에서 처리되며 운영상 삭제될 수 있습니다.</li>
        </ul>
        <KButton
          type="button"
          onClick={onClickAcceptNoticeButton}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-bitcoin px-4 text-sm font-bold text-white"
        >
          <Check size={17} />
          확인하고 참여하기
        </KButton>
      </section>
    </div>
  ) : null;

  const ConfigurationTemplate =
    hasAcceptedNotice && !chatConfig.isConnectionConfigured ? (
      <div className="flex min-h-0 flex-1 items-center justify-center p-5 text-center">
        <div>
          <p className="text-sm font-bold">채팅 서버를 준비하고 있어요</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            공개 채팅 환경값이 설정되면 이곳에서 바로 연결됩니다.
          </p>
        </div>
      </div>
    ) : null;
  // endregion

  const isMutationDisabled = connectionStatus !== "open" || readOnly || isTurnstileRequired;
  const shouldShowRetryButton =
    hasAcceptedNotice && chatConfig.isConnectionConfigured && connectionStatus === "idle";
  const panelStyle =
    isFullscreen && isMobilePanel && mobileViewportHeightInPixels
      ? { height: `${mobileViewportHeightInPixels}px` }
      : undefined;
  const panelClassName = [
    "pointer-events-auto fixed flex flex-col overflow-hidden bg-white font-pretendard shadow-2xl dark:bg-neutral-950",
    isFullscreen
      ? "inset-0 h-[100dvh] w-full rounded-none"
      : "bottom-[calc(84px+4.5rem)] left-3 right-3 h-[min(50dvh,560px)] rounded-3xl border border-neutral-200 dark:border-neutral-700 sm:bottom-[calc(84px+5rem)] sm:left-auto sm:right-4 sm:h-[min(50dvh,560px)] sm:w-[min(420px,calc(100vw-2rem))] layout-max:right-[calc((100vw-524px)/2+1rem)]",
  ].join(" ");

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {isFullscreen && (
        <KButton
          type="button"
          aria-label="채팅 닫기"
          onClick={onClickBackdrop}
          className="pointer-events-auto absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        />
      )}
      <aside
        id="only-bitcoin-chat-panel"
        ref={panelReference}
        role="dialog"
        aria-label="익명 실시간 채팅"
        aria-modal={isFullscreen || undefined}
        onKeyDown={onKeyDownPanel}
        style={panelStyle}
        className={panelClassName}
      >
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-neutral-200 px-4 dark:border-neutral-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">익명 채팅</h2>
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {online}명
              </span>
            </div>
            <p className="mt-1 text-[10px] text-neutral-500">{connectionStatusLabel}</p>
          </div>

          <div className="flex items-center gap-1">
            {me && !isNicknameEditorOpen && (
              <KButton
                type="button"
                aria-label="닉네임 변경"
                onClick={onClickNicknameEditButton}
                className="inline-flex max-w-40 items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1.5 text-[11px] dark:bg-neutral-800"
              >
                <span className="truncate">
                  {me.nickname}#{me.anonId}
                </span>
                <Pencil size={11} />
              </KButton>
            )}
            <KButton
              type="button"
              aria-label={isFullscreen ? "채팅 말풍선 크기로 축소" : "채팅 전체 화면으로 확대"}
              aria-pressed={isFullscreen}
              onClick={onClickToggleFullscreenButton}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </KButton>
            <KButton
              ref={closeButtonReference}
              type="button"
              aria-label="채팅 닫기"
              onClick={onClickCloseButton}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={19} />
            </KButton>
          </div>
        </header>

        {isNicknameEditorOpen && (
          <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
            <label htmlFor="chat-nickname" className="sr-only">
              닉네임
            </label>
            <KTextField
              id="chat-nickname"
              value={nicknameDraft}
              onChange={onChangeNicknameInput}
              maxLength={40}
              className="h-9 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-transparent px-3 text-xs outline-none focus:border-bitcoin dark:border-neutral-700"
            />
            <KButton
              type="button"
              onClick={onClickNicknameSaveButton}
              className="h-9 rounded-xl bg-bitcoin px-3 text-xs font-bold text-white"
            >
              저장
            </KButton>
          </div>
        )}

        {readOnly && (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            현재 읽기 전용입니다{reasonCode ? ` (${reasonCode})` : ""}.
          </p>
        )}
        {isTurnstileRequired && <ChatTurnstile onVerifyToken={onVerifyTurnstileToken} />}
        {shouldShowRetryButton && (
          <KButton
            type="button"
            onClick={onClickRetryConnectionButton}
            className="m-3 inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-700"
          >
            <RotateCw size={14} />
            다시 연결
          </KButton>
        )}

        {NoticeTemplate}
        {ConfigurationTemplate}
        {hasAcceptedNotice && chatConfig.isConnectionConfigured && (
          <>
            <ChatMessageList
              currentAnonId={me?.anonId}
              online={online}
              expandedMessageIds={expandedMessageIds}
              isMarketContextExpanded={isMarketContextExpanded}
              savedScrollTop={savedScrollTop}
              onChangeSavedScrollTop={onChangeSavedScrollTop}
              onToggleMessageExpanded={onToggleMessageExpanded}
              onToggleMarketContext={onToggleMarketContext}
              onSelectReply={onSelectReplyMessage}
              onToggleReaction={toggleReaction}
              onRequestMoreMessages={requestMoreMessages}
            />
            <ChatComposer
              draft={draft}
              selectedReply={selectedReply}
              pendingSayRequest={pendingSayRequest}
              isMutationDisabled={isMutationDisabled}
              onChangeDraft={onChangeDraft}
              onCancelReply={onCancelReplyMessage}
              onSendMessage={sendMessage}
              onChangePendingSayRid={onChangePendingSayRequestId}
              onAcknowledgeSentMessage={acknowledgeSentMessage}
            />
          </>
        )}

        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </aside>
    </div>
  );
}
