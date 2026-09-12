"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/entities/chat-message";
import type { ChatIdentity } from "@/features/chat-session";
import { loadOrCreateChatIdentity } from "@/features/chat-session";
import { CHAT_NOTICE_VERSION, CHAT_STORAGE_KEYS } from "@/shared/config/chat";
import { useStandaloneRuntime } from "@/shared/lib/pwa/client";
import ChatInstallGuide from "./ChatInstallGuide";
import ChatLauncher from "./ChatLauncher";
import ChatPanelPortal from "./ChatPanelPortal";

/** `chat-panel-out` 재생 시간과 맞춤. 이 시간이 지난 뒤 패널을 언마운트한다. */
const CHAT_PANEL_CLOSE_ANIMATION_DURATION_IN_MILLISECONDS = 200;

export default function ChatWidget() {
  // region [Hooks]
  const launcherButtonReference = useRef<HTMLButtonElement | null>(null);
  const closePanelTimerReference = useRef<number | null>(null);
  const { isRuntimeChecked, isStandalone, refreshStandaloneRuntime } = useStandaloneRuntime();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState<boolean | null>(null);
  const [hasAcceptedNotice, setHasAcceptedNotice] = useState(false);
  const [identity, setIdentity] = useState<ChatIdentity | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedReply, setSelectedReply] = useState<ChatMessage | null>(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState<ReadonlySet<string>>(new Set());
  const [savedScrollTop, setSavedScrollTop] = useState<number | null>(null);
  const [pendingSayRequestId, setPendingSayRequestId] = useState<string | null>(null);
  const synchronizeChatWithStandaloneRuntime = useCallback((): void => {
    const hasPreviouslyOpenedChat = window.localStorage.getItem(CHAT_STORAGE_KEYS.opened) === "1";
    const hasAcceptedCurrentNotice =
      window.localStorage.getItem(CHAT_STORAGE_KEYS.noticeVersion) === CHAT_NOTICE_VERSION;
    setHasOpenedChat(hasPreviouslyOpenedChat);
    setHasAcceptedNotice(hasAcceptedCurrentNotice);

    if (isStandalone) {
      setIsInstallGuideOpen(false);
      return;
    }

    setIsPanelOpen(false);
  }, [isStandalone]);
  // endregion

  // region [Privates]
  const restoreLauncherFocus = (): void => {
    window.requestAnimationFrame(() => {
      launcherButtonReference.current?.focus();
    });
  };

  const clearClosePanelTimer = (): void => {
    if (closePanelTimerReference.current === null) {
      return;
    }

    window.clearTimeout(closePanelTimerReference.current);
    closePanelTimerReference.current = null;
  };

  const openStandaloneChat = (): void => {
    const nextIdentity = loadOrCreateChatIdentity();
    const storedNoticeVersion = window.localStorage.getItem(CHAT_STORAGE_KEYS.noticeVersion);
    window.localStorage.setItem(CHAT_STORAGE_KEYS.opened, "1");
    clearClosePanelTimer();
    setIsPanelClosing(false);
    setIdentity(nextIdentity);
    setHasOpenedChat(true);
    setHasAcceptedNotice(storedNoticeVersion === CHAT_NOTICE_VERSION);
    setSavedScrollTop(null);
    setIsPanelOpen(true);
  };

  /**
   * 닫힘 애니메이션이 끝날 때까지 패널을 살려 둔다.
   *
   * `isPanelOpen` 은 즉시 내려서 런처의 `aria-expanded` 와 온라인 수 폴링이 바로
   * 닫힌 상태를 따르게 하고, 언마운트만 `isPanelClosing` 으로 미룬다.
   */
  const closeChatPanel = (): void => {
    clearClosePanelTimer();
    setIsPanelOpen(false);
    setIsPanelClosing(true);
    closePanelTimerReference.current = window.setTimeout(() => {
      closePanelTimerReference.current = null;
      setIsPanelClosing(false);
    }, CHAT_PANEL_CLOSE_ANIMATION_DURATION_IN_MILLISECONDS);
    restoreLauncherFocus();
  };

  const closeInstallGuide = (): void => {
    setIsInstallGuideOpen(false);
    restoreLauncherFocus();
  };
  // endregion

  // region [Events]
  const onClickChatLauncher = (): void => {
    const currentIsStandalone = refreshStandaloneRuntime();

    if (!currentIsStandalone) {
      setIsInstallGuideOpen(true);
      return;
    }

    setIsInstallGuideOpen(false);

    if (isPanelOpen) {
      closeChatPanel();
      return;
    }

    openStandaloneChat();
  };

  const onCloseChatPanel = useCallback((): void => {
    closeChatPanel();
  }, []);

  const onCloseInstallGuide = useCallback((): void => {
    closeInstallGuide();
  }, []);

  const onAcceptChatNotice = useCallback((): void => {
    window.localStorage.setItem(CHAT_STORAGE_KEYS.noticeVersion, CHAT_NOTICE_VERSION);
    setHasAcceptedNotice(true);
  }, []);

  const onChangeDraft = useCallback((nextDraft: string): void => {
    setDraft(nextDraft);
  }, []);

  const onChangeSelectedReply = useCallback((message: ChatMessage | null): void => {
    setSelectedReply(message);
  }, []);

  const onToggleMessageExpanded = useCallback((messageId: string): void => {
    setExpandedMessageIds((currentExpandedMessageIds) => {
      const nextExpandedMessageIds = new Set(currentExpandedMessageIds);

      if (nextExpandedMessageIds.has(messageId)) {
        nextExpandedMessageIds.delete(messageId);
      } else {
        nextExpandedMessageIds.add(messageId);
      }

      return nextExpandedMessageIds;
    });
  }, []);

  const onChangeSavedScrollTop = useCallback((scrollTop: number): void => {
    setSavedScrollTop(scrollTop);
  }, []);

  const onChangePendingSayRequestId = useCallback((requestId: string | null): void => {
    setPendingSayRequestId(requestId);
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (!isRuntimeChecked) {
      return;
    }

    synchronizeChatWithStandaloneRuntime();
  }, [isRuntimeChecked, synchronizeChatWithStandaloneRuntime]);

  useEffect(() => {
    return () => {
      if (closePanelTimerReference.current !== null) {
        window.clearTimeout(closePanelTimerReference.current);
      }
    };
  }, []);
  // endregion

  // region [Templates]
  const shouldRenderChatPanel = isRuntimeChecked && isStandalone && (isPanelOpen || isPanelClosing);

  // KBottomSheet가 자체 포털을 사용하므로 createPortal로 감싸지 않음.
  const InstallGuideSheet =
    isRuntimeChecked && !isStandalone && isInstallGuideOpen ? (
      <ChatInstallGuide onClose={onCloseInstallGuide} />
    ) : null;
  // endregion

  return (
    <>
      <ChatLauncher
        launcherButtonReference={launcherButtonReference}
        isRuntimeChecked={isRuntimeChecked}
        isStandalone={isStandalone}
        isPanelOpen={isPanelOpen}
        hasOpenedChat={hasOpenedChat}
        hasAcceptedNotice={hasAcceptedNotice}
        onClickLauncher={onClickChatLauncher}
      />
      <ChatPanelPortal
        shouldRenderPanel={shouldRenderChatPanel}
        isClosing={isPanelClosing}
        identity={identity}
        hasAcceptedNotice={hasAcceptedNotice}
        draft={draft}
        selectedReply={selectedReply}
        expandedMessageIds={expandedMessageIds}
        savedScrollTop={savedScrollTop}
        pendingSayRequestId={pendingSayRequestId}
        onClose={onCloseChatPanel}
        onAcceptNotice={onAcceptChatNotice}
        onChangeDraft={onChangeDraft}
        onChangeSelectedReply={onChangeSelectedReply}
        onToggleMessageExpanded={onToggleMessageExpanded}
        onChangeSavedScrollTop={onChangeSavedScrollTop}
        onChangePendingSayRequestId={onChangePendingSayRequestId}
      />
      {InstallGuideSheet}
    </>
  );
}
