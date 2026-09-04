"use client";

import { KPopover, KPopoverContent, KPopoverTrigger } from "kku-ui";
import { MessageCircleReply, SmilePlus } from "lucide-react";
import { type KeyboardEvent, memo } from "react";
import { CHAT_COLLAPSED_MESSAGE_GRAPHEMES } from "@/shared/config/chat";
import { countGraphemes, truncateGraphemes } from "@/shared/lib/text/countGraphemes";
import {
  CHAT_REACTION_KEYS,
  CHAT_REACTION_LABELS,
  type ChatMessage,
  type ChatReactionKey,
  createChatMessageElementId,
  formatChatAnonId,
} from "../model/chatMessage";

interface ChatMessageItemProps {
  message: ChatMessage;
  currentAnonId?: string;
  isExpanded: boolean;
  isReactionPickerOpen: boolean;
  onToggleExpanded: (messageId: string) => void;
  onSelectReply: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
  onNavigateToMessage: (messageId: string) => void;
  onChangeReactionPicker: (messageId: string, isOpen: boolean) => void;
}

interface ReactionButtonProps {
  messageId: string;
  reactionKey: ChatReactionKey;
  count: number;
  isActive: boolean;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
}

const messageTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function ReactionButton({
  messageId,
  reactionKey,
  count,
  isActive,
  onToggleReaction,
}: ReactionButtonProps) {
  // region [Events]
  const onClickReactionButton = (): void => {
    onToggleReaction(messageId, reactionKey);
  };
  // endregion

  return (
    <button
      type="button"
      aria-label={`${CHAT_REACTION_LABELS[reactionKey]} 반응 ${isActive ? "취소" : "추가"}`}
      aria-pressed={isActive}
      onClick={onClickReactionButton}
      className={[
        "inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors",
        isActive
          ? "border-bitcoin bg-bitcoin/15 text-bitcoin"
          : "border-neutral-200 bg-white/80 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-300",
      ].join(" ")}
    >
      <span aria-hidden>{CHAT_REACTION_LABELS[reactionKey]}</span>
      {count > 0 && <span className="font-number">{count}</span>}
    </button>
  );
}

function ChatMessageItem({
  message,
  currentAnonId,
  isExpanded,
  isReactionPickerOpen,
  onToggleExpanded,
  onSelectReply,
  onToggleReaction,
  onNavigateToMessage,
  onChangeReactionPicker,
}: ChatMessageItemProps) {
  // region [Privates]
  const isMyMessage = currentAnonId === message.anonId;
  const messageGraphemeCount = countGraphemes(message.body);
  const shouldCollapseMessage = messageGraphemeCount > CHAT_COLLAPSED_MESSAGE_GRAPHEMES;
  const isParentMessageNavigable = Boolean(message.parent?.snippet);
  const visibleMessageBody =
    shouldCollapseMessage && !isExpanded
      ? `${truncateGraphemes(message.body, CHAT_COLLAPSED_MESSAGE_GRAPHEMES)}…`
      : message.body;

  const hasSelectedReaction = (reactionKey: ChatReactionKey): boolean => {
    return message.myReactions?.includes(reactionKey) ?? false;
  };
  // endregion

  // region [Events]
  const onClickReplyButton = (): void => {
    onChangeReactionPicker(message.id, false);
    onSelectReply(message);
  };

  const onClickExpandButton = (): void => {
    onToggleExpanded(message.id);
  };

  const onChangeReactionPopover = (isOpen: boolean): void => {
    onChangeReactionPicker(message.id, isOpen);
  };

  const onSelectReaction = (messageId: string, reactionKey: ChatReactionKey): void => {
    onToggleReaction(messageId, reactionKey);
    onChangeReactionPicker(message.id, false);
  };

  const onClickParentMessageBlockquote = (): void => {
    if (!message.parent || !isParentMessageNavigable) {
      return;
    }

    onNavigateToMessage(message.parent.id);
  };

  const onKeyDownParentMessageBlockquote = (
    keyboardEvent: KeyboardEvent<HTMLQuoteElement>,
  ): void => {
    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
      return;
    }

    keyboardEvent.preventDefault();
    onClickParentMessageBlockquote();
  };

  // endregion

  // region [Templates]
  const VisibleReactionButtonsTemplate = CHAT_REACTION_KEYS.filter((reactionKey) => {
    return message.reactions[reactionKey] > 0;
  }).map((reactionKey) => (
    <ReactionButton
      key={reactionKey}
      messageId={message.id}
      reactionKey={reactionKey}
      count={message.reactions[reactionKey]}
      isActive={hasSelectedReaction(reactionKey)}
      onToggleReaction={onToggleReaction}
    />
  ));

  const ReplyButtonTemplate = (
    <button
      type="button"
      aria-label="답글 작성"
      onClick={onClickReplyButton}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-bitcoin dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <MessageCircleReply size={15} />
    </button>
  );

  const ReactionAddButtonTemplate = (
    <button
      type="button"
      aria-label="반응 추가"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-bitcoin dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <SmilePlus size={15} />
    </button>
  );

  const ReactionPickerTemplate = (
    <KPopover open={isReactionPickerOpen} onOpenChange={onChangeReactionPopover}>
      <KPopoverTrigger asChild>{ReactionAddButtonTemplate}</KPopoverTrigger>
      <KPopoverContent
        side="top"
        align={isMyMessage ? "end" : "start"}
        sideOffset={6}
        collisionPadding={12}
        className="!z-[110] !w-auto !max-w-[calc(100vw-1.5rem)] !rounded-xl !border-neutral-200 !bg-white/95 !p-1 !shadow-lg !backdrop-blur-sm dark:!border-neutral-700 dark:!bg-neutral-900/95"
      >
        <fieldset
          aria-label="메시지 반응 선택"
          className="flex w-max max-w-full items-center gap-1"
        >
          {CHAT_REACTION_KEYS.map((reactionKey) => (
            <ReactionButton
              key={reactionKey}
              messageId={message.id}
              reactionKey={reactionKey}
              count={message.reactions[reactionKey]}
              isActive={hasSelectedReaction(reactionKey)}
              onToggleReaction={onSelectReaction}
            />
          ))}
        </fieldset>
      </KPopoverContent>
    </KPopover>
  );

  const ReactionActionsTemplate = (
    <>
      {VisibleReactionButtonsTemplate}
      {ReactionPickerTemplate}
    </>
  );

  // endregion

  return (
    <article
      id={createChatMessageElementId(message.id)}
      tabIndex={-1}
      className={`flex flex-col gap-1.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bitcoin ${isMyMessage ? "items-end" : "items-start"}`}
    >
      <div className="flex items-baseline gap-2 px-1 text-xs text-neutral-500 dark:text-neutral-400">
        <strong className="font-medium text-neutral-700 dark:text-neutral-200">
          {message.nickname}#{formatChatAnonId(message.anonId)}
        </strong>
        <time dateTime={new Date(message.createdAt).toISOString()}>
          {messageTimeFormatter.format(message.createdAt)}
        </time>
      </div>

      <div
        className={[
          "flex w-full items-end gap-1",
          isMyMessage ? "flex-row-reverse" : "flex-row",
        ].join(" ")}
      >
        <div
          data-chat-message-bubble
          className={[
            "min-w-0 max-w-[88%] rounded-2xl border px-2.5 py-2 text-[13px] leading-5 shadow-sm",
            isMyMessage
              ? "rounded-tr-md border-bitcoin/30 bg-bitcoin/10"
              : "rounded-tl-md border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900",
          ].join(" ")}
        >
          {message.parent && (
            <blockquote
              role={isParentMessageNavigable ? "button" : undefined}
              tabIndex={isParentMessageNavigable ? 0 : undefined}
              aria-label={
                isParentMessageNavigable
                  ? `${message.parent.nickname}님의 원본 메시지로 이동`
                  : undefined
              }
              onClick={onClickParentMessageBlockquote}
              onKeyDown={onKeyDownParentMessageBlockquote}
              className={[
                "mb-1.5 border-l-2 border-bitcoin/60 pl-2 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400",
                isParentMessageNavigable
                  ? "cursor-pointer rounded-r-md transition-colors hover:bg-bitcoin/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bitcoin"
                  : "cursor-default",
              ].join(" ")}
            >
              <strong>
                {message.parent.nickname}#{formatChatAnonId(message.parent.anonId)}
              </strong>
              <span className="mt-0.5 block truncate">
                {message.parent.snippet || "삭제된 메시지"}
              </span>
            </blockquote>
          )}
          <p className="whitespace-pre-wrap break-words">{visibleMessageBody}</p>
          {shouldCollapseMessage && (
            <button
              type="button"
              onClick={onClickExpandButton}
              className="mt-1 text-xs font-semibold text-bitcoin"
            >
              {isExpanded ? "접기" : "더 보기"}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 pb-0.5">
          {isMyMessage ? (
            <>
              {ReactionActionsTemplate}
              {ReplyButtonTemplate}
            </>
          ) : (
            <>
              {ReplyButtonTemplate}
              {ReactionActionsTemplate}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(ChatMessageItem);
