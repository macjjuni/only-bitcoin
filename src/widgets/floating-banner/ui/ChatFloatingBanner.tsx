"use client";

import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage } from "@/entities/chat-message";
import type { ChatIdentity } from "@/features/chat-session";
import { loadOrCreateChatIdentity } from "@/features/chat-session";
import { CHAT_NOTICE_VERSION, CHAT_STORAGE_KEYS, chatConfig } from "@/shared/config/chat";
import { useStandaloneRuntime } from "@/shared/lib/pwa/client";
import { FloatingBannerButton } from "@/shared/ui";
import { ChatPanel } from "@/widgets/chat-panel";
import ChatInstallGuide from "./ChatInstallGuide";

interface OnlineResponse {
  online: number;
}

// region [Privates]
const fetchOnlineCount = async (): Promise<OnlineResponse> => {
  const onlineResponse = await fetch(`${chatConfig.apiUrl}/v1/chat/online`, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    headers: { Accept: "application/json" },
  });

  if (!onlineResponse.ok) {
    throw new Error("온라인 수를 불러오지 못했습니다.");
  }

  const responsePayload: unknown = await onlineResponse.json();

  if (
    typeof responsePayload !== "object" ||
    responsePayload === null ||
    !("online" in responsePayload) ||
    typeof responsePayload.online !== "number" ||
    responsePayload.online < 0
  ) {
    throw new Error("온라인 수 응답 형식이 올바르지 않습니다.");
  }

  return { online: responsePayload.online };
};
// endregion

export default function ChatFloatingBanner() {
  // region [Hooks]
  const launcherButtonReference = useRef<HTMLButtonElement | null>(null);
  const { isRuntimeChecked, isStandalone, refreshStandaloneRuntime } = useStandaloneRuntime();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const [hasAcceptedNotice, setHasAcceptedNotice] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);
  const [identity, setIdentity] = useState<ChatIdentity | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedReply, setSelectedReply] = useState<ChatMessage | null>(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState<ReadonlySet<string>>(new Set());
  const [savedScrollTop, setSavedScrollTop] = useState<number | null>(null);
  const [pendingSayRequestId, setPendingSayRequestId] = useState<string | null>(null);
  const synchronizeChatWithStandaloneRuntime = useCallback((): void => {
    if (isStandalone) {
      setIsInstallGuideOpen(false);
      setHasOpenedChat(window.localStorage.getItem(CHAT_STORAGE_KEYS.opened) === "1");
      return;
    }

    setIsPanelOpen(false);
  }, [isStandalone]);
  const shouldPollOnlineCount =
    isRuntimeChecked &&
    isStandalone &&
    hasOpenedChat &&
    !isPanelOpen &&
    isDocumentVisible &&
    isNetworkOnline &&
    chatConfig.isConnectionConfigured;
  const onlineCountQuery = useQuery({
    queryKey: ["chat", "online"],
    queryFn: fetchOnlineCount,
    enabled: shouldPollOnlineCount,
    staleTime: 15_000,
    refetchInterval: shouldPollOnlineCount ? 90_000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
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
    } else {
      openStandaloneChat();
    }
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
    setIsDocumentVisible(document.visibilityState === "visible");
    setIsNetworkOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (!isRuntimeChecked) {
      return;
    }

    synchronizeChatWithStandaloneRuntime();
  }, [isRuntimeChecked, synchronizeChatWithStandaloneRuntime]);

  useEffect(() => {
    const onVisibilityChangeDocument = (): void => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };
    const onOnlineWindow = (): void => {
      setIsNetworkOnline(true);
    };
    const onOfflineWindow = (): void => {
      setIsNetworkOnline(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChangeDocument);
    window.addEventListener("online", onOnlineWindow);
    window.addEventListener("offline", onOfflineWindow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChangeDocument);
      window.removeEventListener("online", onOnlineWindow);
      window.removeEventListener("offline", onOfflineWindow);
    };
  }, []);

  // endregion

  // region [Templates]
  const ChatPanelPortal =
    isRuntimeChecked && isStandalone && isPanelOpen
      ? createPortal(
          <ChatPanel
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
          />,
          document.body,
        )
      : null;

  // KBottomSheet 가 자체 포탈을 쓰므로 createPortal 로 감싸지 않음.
  const InstallGuideSheet =
    isRuntimeChecked && !isStandalone && isInstallGuideOpen ? (
      <ChatInstallGuide onClose={onCloseInstallGuide} />
    ) : null;
  // endregion

  const launcherAccessibleName = !isRuntimeChecked
    ? "채팅 실행 환경 확인 중"
    : isStandalone
      ? `채팅 ${isPanelOpen ? "닫기" : "열기"}`
      : "채팅 앱 설치 안내";
  const onlineCount = onlineCountQuery.data?.online;
  const shouldShowOnlineBadge =
    isStandalone && !isPanelOpen && hasOpenedChat && onlineCount !== undefined;

  return (
    <>
      <FloatingBannerButton
        buttonRef={launcherButtonReference}
        aria-label={launcherAccessibleName}
        aria-expanded={isStandalone ? isPanelOpen : undefined}
        aria-controls={isStandalone ? "only-bitcoin-chat-panel" : undefined}
        onClick={onClickChatLauncher}
        className="relative"
      >
        <Send size={24} className="pointer-events-none text-neutral-900 dark:text-white" />
        {shouldShowOnlineBadge && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-green-500 px-1.5 py-0.5 font-number text-[10px] font-bold leading-4 text-white shadow-sm">
            {onlineCount > 99 ? "99+" : onlineCount}
          </span>
        )}
      </FloatingBannerButton>
      {ChatPanelPortal}
      {InstallGuideSheet}
    </>
  );
}
