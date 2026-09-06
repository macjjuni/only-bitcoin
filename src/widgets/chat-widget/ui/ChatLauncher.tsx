"use client";

import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { type RefObject, useCallback, useEffect, useState } from "react";
import { chatConfig } from "@/shared/config/chat";
import { FloatingBannerButton } from "@/shared/ui";

interface OnlineResponse {
  online: number;
}

interface ChatLauncherProps {
  launcherButtonReference: RefObject<HTMLButtonElement | null>;
  isRuntimeChecked: boolean;
  isStandalone: boolean;
  isPanelOpen: boolean;
  hasOpenedChat: boolean;
  onClickLauncher: () => void;
}

const CHAT_LAUNCHER_VISIBLE_PATHS = ["/", "/overview", "/blocks", "/btc2fiat", "/orange"] as const;

// region [Privates]
const createLauncherAccessibleName = (
  isRuntimeChecked: boolean,
  isStandalone: boolean,
  isPanelOpen: boolean,
): string => {
  if (!isRuntimeChecked) {
    return "채팅 실행 환경 확인 중";
  }

  if (!isStandalone) {
    return "채팅 앱 설치 안내";
  }

  return `채팅 ${isPanelOpen ? "닫기" : "열기"}`;
};
// endregion

// region [Transactions]
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

export default function ChatLauncher({
  launcherButtonReference,
  isRuntimeChecked,
  isStandalone,
  isPanelOpen,
  hasOpenedChat,
  onClickLauncher,
}: ChatLauncherProps) {
  // region [Hooks]
  const pathname = usePathname();
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);
  const isLauncherVisible = CHAT_LAUNCHER_VISIBLE_PATHS.some(
    (visiblePath) => visiblePath === pathname,
  );
  const shouldPollOnlineCount =
    isLauncherVisible &&
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

  // region [Events]
  const onVisibilityChangeDocument = useCallback((): void => {
    setIsDocumentVisible(document.visibilityState === "visible");
  }, []);

  const onOnlineWindow = useCallback((): void => {
    setIsNetworkOnline(true);
  }, []);

  const onOfflineWindow = useCallback((): void => {
    setIsNetworkOnline(false);
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    onVisibilityChangeDocument();
    setIsNetworkOnline(navigator.onLine);

    document.addEventListener("visibilitychange", onVisibilityChangeDocument);
    window.addEventListener("online", onOnlineWindow);
    window.addEventListener("offline", onOfflineWindow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChangeDocument);
      window.removeEventListener("online", onOnlineWindow);
      window.removeEventListener("offline", onOfflineWindow);
    };
  }, [onOfflineWindow, onOnlineWindow, onVisibilityChangeDocument]);
  // endregion

  // region [Templates]
  const launcherAccessibleName = createLauncherAccessibleName(
    isRuntimeChecked,
    isStandalone,
    isPanelOpen,
  );
  const onlineCount = onlineCountQuery.data?.online;
  const shouldShowOnlineBadge =
    isStandalone && !isPanelOpen && hasOpenedChat && onlineCount !== undefined;
  // endregion

  if (!isLauncherVisible) {
    return null;
  }

  return (
    <FloatingBannerButton
      buttonRef={launcherButtonReference}
      aria-label={launcherAccessibleName}
      aria-expanded={isStandalone ? isPanelOpen : undefined}
      aria-controls={isStandalone ? "only-bitcoin-chat-panel" : undefined}
      onClick={onClickLauncher}
      className="relative"
    >
      <Send size={24} className="pointer-events-none text-neutral-900 dark:text-white" />
      {shouldShowOnlineBadge && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-green-500 px-1.5 py-0.5 font-number text-[10px] font-bold leading-4 text-white shadow-sm">
          {onlineCount > 99 ? "99+" : onlineCount}
        </span>
      )}
    </FloatingBannerButton>
  );
}
