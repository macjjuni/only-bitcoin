"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type ChatMessage, ChatMessageItem, type ChatReactionKey } from "@/entities/chat-message";
import { useChatStore } from "@/features/chat-session";
import ChatMarketContextCard from "./ChatMarketContextCard";

interface ChatMessageListProps {
  currentAnonId?: string;
  online: number;
  expandedMessageIds: ReadonlySet<string>;
  isMarketContextExpanded: boolean;
  savedScrollTop: number | null;
  onChangeSavedScrollTop: (scrollTop: number) => void;
  onToggleMessageExpanded: (messageId: string) => void;
  onToggleMarketContext: () => void;
  onSelectReply: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
  onRequestMoreMessages: (beforeId: string) => string | null;
}

interface ConnectedChatMessageItemProps {
  messageId: string;
  currentAnonId?: string;
  isExpanded: boolean;
  onToggleMessageExpanded: (messageId: string) => void;
  onSelectReply: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
}

const BOTTOM_PROXIMITY_IN_PIXELS = 80;
function ConnectedChatMessageItem({
  messageId,
  currentAnonId,
  isExpanded,
  onToggleMessageExpanded,
  onSelectReply,
  onToggleReaction,
}: ConnectedChatMessageItemProps) {
  const message = useChatStore((chatState) => chatState.messagesById[messageId]);

  if (!message) {
    return null;
  }

  return (
    <ChatMessageItem
      message={message}
      currentAnonId={currentAnonId}
      isExpanded={isExpanded}
      onToggleExpanded={onToggleMessageExpanded}
      onSelectReply={onSelectReply}
      onToggleReaction={onToggleReaction}
    />
  );
}

export default function ChatMessageList({
  currentAnonId,
  online,
  expandedMessageIds,
  isMarketContextExpanded,
  savedScrollTop,
  onChangeSavedScrollTop,
  onToggleMessageExpanded,
  onToggleMarketContext,
  onSelectReply,
  onToggleReaction,
  onRequestMoreMessages,
}: ChatMessageListProps) {
  // region [Hooks]
  const messageIds = useChatStore((chatState) => chatState.messageIds);
  const hasMore = useChatStore((chatState) => chatState.hasMore);
  const pendingRequests = useChatStore((chatState) => chatState.pendingRequests);
  const scrollContainerReference = useRef<HTMLDivElement | null>(null);
  const topSentinelReference = useRef<HTMLDivElement | null>(null);
  const previousNewestMessageIdReference = useRef<string | null>(null);
  const prependScrollHeightReference = useRef<number | null>(null);
  const pendingMoreRequestIdReference = useRef<string | null>(null);
  const isNearBottomReference = useRef(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
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
    setNewMessageCount(0);
  };

  const loadMoreMessages = (): void => {
    const scrollContainer = scrollContainerReference.current;
    const oldestMessageId = messageIds[0];

    if (!scrollContainer || !oldestMessageId || !hasMore || pendingMoreRequestIdReference.current) {
      return;
    }

    const requestId = onRequestMoreMessages(oldestMessageId);

    if (!requestId) {
      return;
    }

    prependScrollHeightReference.current = scrollContainer.scrollHeight;
    pendingMoreRequestIdReference.current = requestId;
  };
  // endregion

  // region [Events]
  const onScrollMessageList = (): void => {
    const scrollContainer = scrollContainerReference.current;

    if (!scrollContainer) {
      return;
    }

    isNearBottomReference.current = isScrollNearBottom(scrollContainer);
    onChangeSavedScrollTop(scrollContainer.scrollTop);

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
      return;
    }

    if (previousNewestMessageIdReference.current === null) {
      scrollContainer.scrollTop = savedScrollTop ?? scrollContainer.scrollHeight;
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

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollContainerReference}
        onScroll={onScrollMessageList}
        className="h-full overflow-y-auto overscroll-contain pb-4"
      >
        <ChatMarketContextCard
          isExpanded={isMarketContextExpanded}
          onToggleExpanded={onToggleMarketContext}
        />

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
              onToggleMessageExpanded={onToggleMessageExpanded}
              onSelectReply={onSelectReply}
              onToggleReaction={onToggleReaction}
            />
          ))}
        </div>
      </div>

      {newMessageCount > 0 && (
        <button
          type="button"
          onClick={onClickNewMessagesButton}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-neutral-900"
        >
          새 메시지 {newMessageCount}개
        </button>
      )}
    </div>
  );
}
