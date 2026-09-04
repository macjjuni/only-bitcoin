"use client";

import { MessageCircleReply, Plus } from "lucide-react";
import { memo, useState } from "react";
import { CHAT_COLLAPSED_MESSAGE_GRAPHEMES } from "@/shared/config/chat";
import { countGraphemes, truncateGraphemes } from "@/shared/lib/text/countGraphemes";
import {
  CHAT_REACTION_KEYS,
  CHAT_REACTION_LABELS,
  type ChatMessage,
  type ChatReactionKey,
  formatChatAnonId,
} from "../model/chatMessage";

interface ChatMessageItemProps {
  message: ChatMessage;
  currentAnonId?: string;
  isExpanded: boolean;
  onToggleExpanded: (messageId: string) => void;
  onSelectReply: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, reactionKey: ChatReactionKey) => void;
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
  onToggleExpanded,
  onSelectReply,
  onToggleReaction,
}: ChatMessageItemProps) {
  // region [Hooks]
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  // endregion

  // region [Privates]
  const isMyMessage = currentAnonId === message.anonId;
  const messageGraphemeCount = countGraphemes(message.body);
  const shouldCollapseMessage = messageGraphemeCount > CHAT_COLLAPSED_MESSAGE_GRAPHEMES;
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
    onSelectReply(message);
  };

  const onClickExpandButton = (): void => {
    onToggleExpanded(message.id);
  };

  const onClickReactionPickerButton = (): void => {
    setIsReactionPickerOpen((currentOpenState) => !currentOpenState);
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
      className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] text-neutral-500 hover:text-bitcoin dark:text-neutral-400"
    >
      <MessageCircleReply size={14} />
      답글
    </button>
  );

  const ReactionAddButtonTemplate = (
    <button
      type="button"
      aria-label="반응 추가"
      aria-expanded={isReactionPickerOpen}
      onClick={onClickReactionPickerButton}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
    >
      <Plus size={14} />
    </button>
  );

  const ReactionPickerTemplate = isReactionPickerOpen ? (
    <div className="flex items-center gap-1">
      {CHAT_REACTION_KEYS.map((reactionKey) => (
        <ReactionButton
          key={reactionKey}
          messageId={message.id}
          reactionKey={reactionKey}
          count={message.reactions[reactionKey]}
          isActive={hasSelectedReaction(reactionKey)}
          onToggleReaction={onToggleReaction}
        />
      ))}
    </div>
  ) : null;

  const ReactionActionsTemplate = (
    <>
      {VisibleReactionButtonsTemplate}
      {isMyMessage ? (
        <>
          {ReactionPickerTemplate}
          {ReactionAddButtonTemplate}
        </>
      ) : (
        <>
          {ReactionAddButtonTemplate}
          {ReactionPickerTemplate}
        </>
      )}
    </>
  );

  // endregion

  return (
    <article className={`flex flex-col gap-1.5 ${isMyMessage ? "items-end" : "items-start"}`}>
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
          "max-w-[88%] rounded-2xl border px-2.5 py-2 text-[13px] leading-5 shadow-sm",
          isMyMessage
            ? "rounded-tr-md border-bitcoin/30 bg-bitcoin/10"
            : "rounded-tl-md border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900",
        ].join(" ")}
      >
        {message.parent && (
          <blockquote className="mb-1.5 border-l-2 border-bitcoin/60 pl-2 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
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

      <div className="flex max-w-[92%] flex-wrap items-center gap-1 px-1">
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
    </article>
  );
}

export default memo(ChatMessageItem);
