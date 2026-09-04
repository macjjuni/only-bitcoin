"use client";

import { kToast } from "kku-ui";
import { ArrowDown } from "lucide-react";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  ChatMessageItem,
  type ChatReactionKey,
  createChatMessageElementId,
} from "@/entities/chat-message";
import { ChatDeleteMessageButton } from "@/features/chat-moderation";
import { useChatStore } from "@/features/chat-session";

interface ChatMessageListProps {
  currentAnonId?: string;
  online: number;
  expandedMessageIds: ReadonlySet<string>;
  savedScrollTop: number | null;
  isAdministrator: boolean;
  onChangeSavedScrollTop: (scrollTop: number) => void;
  onToggleMessageExpanded: (messageId: string) => void;
  onSelectReply: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
  onRequestMoreMessages: (beforeId: string) => string | null;
  onRequestDeleteMessage: (message: ChatMessage) => void;
}

interface ConnectedChatMessageItemProps {
  messageId: string;
  currentAnonId?: string;
  isExpanded: boolean;
  isReactionPickerOpen: boolean;
  isAdministrator: boolean;
  onToggleMessageExpanded: (messageId: string) => void;
  onSelectReply: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
  onNavigateToMessage: (messageId: string) => void;
  onChangeReactionPicker: (messageId: string, isOpen: boolean) => void;
  onRequestDeleteMessage: (message: ChatMessage) => void;
}

const BOTTOM_PROXIMITY_IN_PIXELS = 80;
const SCROLL_TO_LATEST_BUTTON_THRESHOLD_IN_PIXELS = 360;
const MORE_REQUEST_INTERVAL_IN_MILLISECONDS = 1_050;
const MESSAGE_HIGHLIGHT_DURATION_IN_MILLISECONDS = 1_400;
const ConnectedChatMessageItem = memo(function ConnectedChatMessageItem({
  messageId,
  currentAnonId,
  isExpanded,
  isReactionPickerOpen,
  isAdministrator,
  onToggleMessageExpanded,
  onSelectReply,
  onToggleReaction,
  onNavigateToMessage,
  onChangeReactionPicker,
  onRequestDeleteMessage,
}: ConnectedChatMessageItemProps) {
  const message = useChatStore((chatState) => chatState.messagesById[messageId]);

  if (!message) {
    return null;
  }

  const AdministratorActionTemplate = isAdministrator ? (
    <ChatDeleteMessageButton message={message} onRequestDelete={onRequestDeleteMessage} />
  ) : null;

  return (
    <ChatMessageItem
      message={message}
      currentAnonId={currentAnonId}
      isExpanded={isExpanded}
      isReactionPickerOpen={isReactionPickerOpen}
      additionalActions={AdministratorActionTemplate}
      onToggleExpanded={onToggleMessageExpanded}
      onSelectReply={onSelectReply}
      onToggleReaction={onToggleReaction}
      onNavigateToMessage={onNavigateToMessage}
      onChangeReactionPicker={onChangeReactionPicker}
    />
  );
});

export default function ChatMessageList({
  currentAnonId,
  online,
  expandedMessageIds,
  savedScrollTop,
  isAdministrator,
  onChangeSavedScrollTop,
  onToggleMessageExpanded,
  onSelectReply,
  onToggleReaction,
  onRequestMoreMessages,
  onRequestDeleteMessage,
}: ChatMessageListProps) {
  // region [Hooks]
  const messageIds = useChatStore((chatState) => chatState.messageIds);
  const hasMore = useChatStore((chatState) => chatState.hasMore);
  const pendingRequests = useChatStore((chatState) => chatState.pendingRequests);
  const scrollContainerReference = useRef<HTMLDivElement | null>(null);
  const savedScrollTopReference = useRef<number>(savedScrollTop ?? 0);
  const hasInitializedScrollReference = useRef(false);
  const topSentinelReference = useRef<HTMLDivElement | null>(null);
  const previousNewestMessageIdReference = useRef<string | null>(null);
  const prependScrollHeightReference = useRef<number | null>(null);
  const pendingMoreRequestIdReference = useRef<string | null>(null);
  const moreRequestStartedAtInMillisecondsReference = useRef<number | null>(null);
  const pendingNavigationMessageIdReference = useRef<string | null>(null);
  const pendingNavigationTimeoutReference = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomReference = useRef(true);
  const [isScrollToLatestButtonVisible, setIsScrollToLatestButtonVisible] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [openReactionPickerMessageId, setOpenReactionPickerMessageId] = useState<string | null>(
    null,
  );
  // endregion

  // region [Privates]
  const isScrollNearBottom = (scrollContainer: HTMLDivElement): boolean => {
    const remainingScrollDistance =
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    return remainingScrollDistance <= BOTTOM_PROXIMITY_IN_PIXELS;
  };

  const scrollToLatestMessage = (): void => {
    const scrollContainer = scrollContainerReference.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
    isNearBottomReference.current = true;
    setIsScrollToLatestButtonVisible(false);
    setNewMessageCount(0);
  };

  const scrollToMessage = (messageId: string): boolean => {
    const scrollContainer = scrollContainerReference.current;
    const messageElement = document.getElementById(createChatMessageElementId(messageId));

    if (!scrollContainer || !messageElement || !scrollContainer.contains(messageElement)) {
      return false;
    }

    const messageBubbleElement = messageElement.querySelector<HTMLElement>(
      "[data-chat-message-bubble]",
    );
    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pendingNavigationMessageIdReference.current = null;

    if (pendingNavigationTimeoutReference.current) {
      clearTimeout(pendingNavigationTimeoutReference.current);
      pendingNavigationTimeoutReference.current = null;
    }

    messageElement.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "center",
    });
    messageElement.focus({ preventScroll: true });

    if (!shouldReduceMotion && messageBubbleElement) {
      messageBubbleElement.animate(
        [
          { backgroundColor: "rgb(var(--bitcoin-rgb) / 0)" },
          { backgroundColor: "rgb(var(--bitcoin-rgb) / 0.12)" },
          { backgroundColor: "rgb(var(--bitcoin-rgb) / 0)" },
        ],
        {
          duration: MESSAGE_HIGHLIGHT_DURATION_IN_MILLISECONDS,
          easing: "ease-out",
        },
      );
    }

    return true;
  };

  const loadMoreMessages = (): boolean => {
    const scrollContainer = scrollContainerReference.current;
    const oldestMessageId = messageIds[0];

    if (!scrollContainer || !oldestMessageId || !hasMore || pendingMoreRequestIdReference.current) {
      return false;
    }

    const requestId = onRequestMoreMessages(oldestMessageId);

    if (!requestId) {
      return false;
    }

    prependScrollHeightReference.current = scrollContainer.scrollHeight;
    pendingMoreRequestIdReference.current = requestId;
    moreRequestStartedAtInMillisecondsReference.current = Date.now();
    return true;
  };

  const notifyMissingOriginalMessage = (): void => {
    kToast.info("원본 메시지는 보관 한도를 초과해 삭제됐어요.");
  };

  const continuePendingMessageNavigation = (): void => {
    const pendingNavigationMessageId = pendingNavigationMessageIdReference.current;

    if (!pendingNavigationMessageId || scrollToMessage(pendingNavigationMessageId)) {
      return;
    }

    if (!hasMore) {
      pendingNavigationMessageIdReference.current = null;
      notifyMissingOriginalMessage();
      return;
    }

    const moreRequestStartedAtInMilliseconds =
      moreRequestStartedAtInMillisecondsReference.current ?? 0;
    const elapsedTimeInMilliseconds = Date.now() - moreRequestStartedAtInMilliseconds;
    const remainingWaitTimeInMilliseconds = Math.max(
      0,
      MORE_REQUEST_INTERVAL_IN_MILLISECONDS - elapsedTimeInMilliseconds,
    );

    if (pendingNavigationTimeoutReference.current) {
      clearTimeout(pendingNavigationTimeoutReference.current);
    }

    pendingNavigationTimeoutReference.current = setTimeout(() => {
      pendingNavigationTimeoutReference.current = null;

      if (!pendingNavigationMessageIdReference.current) {
        return;
      }

      if (!loadMoreMessages() && !pendingMoreRequestIdReference.current) {
        pendingNavigationMessageIdReference.current = null;
      }
    }, remainingWaitTimeInMilliseconds);
  };
  // endregion

  // region [Events]
  const onScrollMessageList = (): void => {
    const scrollContainer = scrollContainerReference.current;

    if (!scrollContainer) {
      return;
    }

    if (openReactionPickerMessageId !== null) {
      setOpenReactionPickerMessageId(null);
    }

    const remainingScrollDistance =
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    isNearBottomReference.current = isScrollNearBottom(scrollContainer);
    setIsScrollToLatestButtonVisible(
      remainingScrollDistance > SCROLL_TO_LATEST_BUTTON_THRESHOLD_IN_PIXELS,
    );
    savedScrollTopReference.current = scrollContainer.scrollTop;

    if (isNearBottomReference.current) {
      setNewMessageCount(0);
    }
  };

  const onClickNewMessagesButton = (): void => {
    scrollToLatestMessage();
  };

  const onClickLoadMoreButton = (): void => {
    loadMoreMessages();
  };

  const onNavigateToMessage = (messageId: string): void => {
    if (scrollToMessage(messageId)) {
      return;
    }

    pendingNavigationMessageIdReference.current = messageId;
    continuePendingMessageNavigation();
  };

  const onChangeReactionPicker = (messageId: string, isOpen: boolean): void => {
    setOpenReactionPickerMessageId(isOpen ? messageId : null);
  };
  // endregion

  // region [Life Cycles]
  useLayoutEffect(() => {
    const scrollContainer = scrollContainerReference.current;

    if (!scrollContainer) {
      return;
    }

    if (prependScrollHeightReference.current !== null) {
      const addedScrollHeight = scrollContainer.scrollHeight - prependScrollHeightReference.current;
      scrollContainer.scrollTop += addedScrollHeight;
      prependScrollHeightReference.current = null;

      const pendingNavigationMessageId = pendingNavigationMessageIdReference.current;

      if (pendingNavigationMessageId) {
        scrollToMessage(pendingNavigationMessageId);
      }

      return;
    }

    if (previousNewestMessageIdReference.current === null && messageIds.length > 0) {
      scrollContainer.scrollTop = savedScrollTop ?? scrollContainer.scrollHeight;
      savedScrollTopReference.current = scrollContainer.scrollTop;
      hasInitializedScrollReference.current = true;
      const isInitialScrollNearBottom = isScrollNearBottom(scrollContainer);
      const initialRemainingScrollDistance =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
      isNearBottomReference.current = isInitialScrollNearBottom;
      setIsScrollToLatestButtonVisible(
        initialRemainingScrollDistance > SCROLL_TO_LATEST_BUTTON_THRESHOLD_IN_PIXELS,
      );
    }
  }, [messageIds, savedScrollTop]);

  useEffect(() => {
    const newestMessageId = messageIds.at(-1) ?? null;
    const previousNewestMessageId = previousNewestMessageIdReference.current;

    if (previousNewestMessageId && newestMessageId && newestMessageId !== previousNewestMessageId) {
      if (isNearBottomReference.current) {
        scrollToLatestMessage();
      } else {
        setNewMessageCount((currentCount) => currentCount + 1);
      }
    }

    previousNewestMessageIdReference.current = newestMessageId;
  }, [messageIds]);

  useEffect(() => {
    const pendingMoreRequestId = pendingMoreRequestIdReference.current;

    if (!pendingMoreRequestId) {
      return;
    }

    const pendingMoreRequest = pendingRequests[pendingMoreRequestId];

    if (pendingMoreRequest && pendingMoreRequest.status !== "pending") {
      pendingMoreRequestIdReference.current = null;

      if (
        pendingMoreRequest.status === "acknowledged" ||
        pendingMoreRequest.errorCode === "RATE_MORE"
      ) {
        continuePendingMessageNavigation();
      } else {
        pendingNavigationMessageIdReference.current = null;
      }
    }
  }, [pendingRequests]);

  useEffect(() => {
    const topSentinel = topSentinelReference.current;
    const scrollContainer = scrollContainerReference.current;

    if (!topSentinel || !scrollContainer || !hasMore) {
      return;
    }

    const topIntersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreMessages();
        }
      },
      { root: scrollContainer, rootMargin: "80px 0px 0px", threshold: 0 },
    );
    topIntersectionObserver.observe(topSentinel);

    return () => {
      topIntersectionObserver.disconnect();
    };
  }, [hasMore, messageIds]);
  // endregion

  useEffect(() => {
    return () => {
      if (pendingNavigationTimeoutReference.current) {
        clearTimeout(pendingNavigationTimeoutReference.current);
      }

      if (hasInitializedScrollReference.current) {
        onChangeSavedScrollTop(savedScrollTopReference.current);
      }
    };
  }, [onChangeSavedScrollTop]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollContainerReference}
        onScroll={onScrollMessageList}
        className="h-full overflow-y-auto overscroll-contain pb-4"
      >
        <div ref={topSentinelReference} aria-hidden className="h-px" />
        {hasMore && messageIds.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={onClickLoadMoreButton}
              className="rounded-full px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              이전 메시지 보기
            </button>
          </div>
        )}

        {online === 0 && (
          <p className="mx-4 mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-center text-[11px] leading-5 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            지금은 조용하지만 글은 최근 300개 안에서 다음 방문자가 볼 수 있어요.
          </p>
        )}

        <div className="flex flex-col gap-4 px-3 pt-4">
          {messageIds.map((messageId) => (
            <ConnectedChatMessageItem
              key={messageId}
              messageId={messageId}
              currentAnonId={currentAnonId}
              isExpanded={expandedMessageIds.has(messageId)}
              isReactionPickerOpen={openReactionPickerMessageId === messageId}
              isAdministrator={isAdministrator}
              onToggleMessageExpanded={onToggleMessageExpanded}
              onSelectReply={onSelectReply}
              onToggleReaction={onToggleReaction}
              onNavigateToMessage={onNavigateToMessage}
              onChangeReactionPicker={onChangeReactionPicker}
              onRequestDeleteMessage={onRequestDeleteMessage}
            />
          ))}
        </div>
      </div>

      {isScrollToLatestButtonVisible && (
        <button
          type="button"
          onClick={onClickNewMessagesButton}
          aria-label="최신 메시지로 이동"
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900"
        >
          <ArrowDown size={14} />
          {newMessageCount > 0 ? `새 메시지 ${newMessageCount}개` : "최신 메시지"}
        </button>
      )}
    </div>
  );
}
