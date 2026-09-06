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

export default function ChatWidget() {
  // region [Hooks]
  const launcherButtonReference = useRef<HTMLButtonElement | null>(null);
  const { isRuntimeChecked, isStandalone, refreshStandaloneRuntime } = useStandaloneRuntime();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
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

  const openStandaloneChat = (): void => {
    const nextIdentity = loadOrCreateChatIdentity();
    const storedNoticeVersion = window.localStorage.getItem(CHAT_STORAGE_KEYS.noticeVersion);
    window.localStorage.setItem(CHAT_STORAGE_KEYS.opened, "1");
    setIdentity(nextIdentity);
    setHasOpenedChat(true);
    setHasAcceptedNotice(storedNoticeVersion === CHAT_NOTICE_VERSION);
    setSavedScrollTop(null);
    setIsPanelOpen(true);
  };

  const closeChatPanel = (): void => {
    setIsPanelOpen(false);
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
  // endregion

  // region [Templates]
  const shouldRenderChatPanel = isRuntimeChecked && isStandalone && isPanelOpen;

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
