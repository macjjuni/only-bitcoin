"use client";

import { KTextarea } from "kku-ui";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type ChatMessage, formatChatAnonId } from "@/entities/chat-message";
import type { ChatPendingRequest } from "@/features/chat-session";
import { CHAT_MAX_MESSAGE_GRAPHEMES } from "@/shared/config/chat";
import { countGraphemes, truncateGraphemes } from "@/shared/lib/text/countGraphemes";

interface ChatComposerProps {
  draft: string;
  selectedReply: ChatMessage | null;
  pendingSayRequest?: ChatPendingRequest;
  isMutationDisabled: boolean;
  onChangeDraft: (draft: string) => void;
  onCancelReply: () => void;
  onSendMessage: (body: string, parentId?: string) => string | null;
  onChangePendingSayRid: (rid: string | null) => void;
  onAcknowledgeSentMessage: () => void;
}

export default function ChatComposer({
  draft,
  selectedReply,
  pendingSayRequest,
  isMutationDisabled,
  onChangeDraft,
  onCancelReply,
  onSendMessage,
  onChangePendingSayRid,
  onAcknowledgeSentMessage,
}: ChatComposerProps) {
  // region [Hooks]
  const isComposingReference = useRef(false);
  const messageTextareaReference = useRef<HTMLTextAreaElement | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  // endregion

  // region [Privates]
  const resizeMessageTextarea = (textareaElement: HTMLTextAreaElement): void => {
    const maximumTextareaHeightInPixels = 64;

    textareaElement.style.height = "auto";
    textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, maximumTextareaHeightInPixels)}px`;
    textareaElement.style.overflowY = "hidden";
  };

  const submitDraft = (): void => {
    if (!draft.trim() || isMutationDisabled || pendingSayRequest?.status === "pending") {
      return;
    }

    const requestId = onSendMessage(draft, selectedReply?.id);

    if (!requestId) {
      setValidationMessage("연결이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setValidationMessage("");
    onChangePendingSayRid(requestId);
  };
  // endregion

  // region [Events]
  const onChangeMessageTextarea = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const nextDraft = isComposingReference.current
      ? event.target.value
      : truncateGraphemes(event.target.value, CHAT_MAX_MESSAGE_GRAPHEMES);
    onChangeDraft(nextDraft);
    resizeMessageTextarea(event.currentTarget);
  };

  const onCompositionStartMessageTextarea = (): void => {
    isComposingReference.current = true;
  };

  const onCompositionEndMessageTextarea = (
    event: React.CompositionEvent<HTMLTextAreaElement>,
  ): void => {
    isComposingReference.current = false;
    onChangeDraft(truncateGraphemes(event.currentTarget.value, CHAT_MAX_MESSAGE_GRAPHEMES));
    resizeMessageTextarea(event.currentTarget);
  };

  const onKeyDownMessageTextarea = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || event.shiftKey || isComposingReference.current) {
      return;
    }

    event.preventDefault();
    submitDraft();
  };

  const onClickSendButton = (): void => {
    submitDraft();
  };

  const onClickCancelReplyButton = (): void => {
    onCancelReply();
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (pendingSayRequest?.status === "acknowledged") {
      onAcknowledgeSentMessage();
      onChangePendingSayRid(null);
    }
  }, [onAcknowledgeSentMessage, onChangePendingSayRid, pendingSayRequest]);

  useEffect(() => {
    if (messageTextareaReference.current) {
      resizeMessageTextarea(messageTextareaReference.current);
    }
  }, [draft]);
  // endregion

  const graphemeCount = countGraphemes(draft);
  const remainingGraphemeCount = CHAT_MAX_MESSAGE_GRAPHEMES - graphemeCount;
  const shouldShowCharacterCount = remainingGraphemeCount <= 30;
  const isSending = pendingSayRequest?.status === "pending";
  const isUncertain = pendingSayRequest?.status === "uncertain";
  const errorMessage = pendingSayRequest?.status === "failed" ? pendingSayRequest.errorMessage : "";

  return (
    <footer className="border-t border-neutral-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 dark:border-neutral-700 dark:bg-neutral-950">
      {selectedReply && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">
          <div className="min-w-0">
            <strong>
              {selectedReply.nickname}#{formatChatAnonId(selectedReply.anonId)}에게 답글
            </strong>
            <p className="mt-1 truncate text-neutral-500">{selectedReply.body}</p>
          </div>
          <button
            type="button"
            aria-label="답글 취소"
            onClick={onClickCancelReplyButton}
            className="shrink-0 rounded-full p-1 text-neutral-500"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="chat-message-composer" className="sr-only">
            메시지 작성
          </label>
          <KTextarea
            id="chat-message-composer"
            ref={messageTextareaReference}
            value={draft}
            rows={1}
            disabled={isMutationDisabled}
            onChange={onChangeMessageTextarea}
            onCompositionStart={onCompositionStartMessageTextarea}
            onCompositionEnd={onCompositionEndMessageTextarea}
            onKeyDown={onKeyDownMessageTextarea}
            placeholder={isMutationDisabled ? "연결되면 메시지를 작성할 수 있어요" : "메시지 입력"}
            className="max-h-16 min-h-10 w-full resize-none overflow-hidden rounded-[20px] border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-5 outline-none focus:border-bitcoin dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            aria-label="메시지 전송"
            disabled={isMutationDisabled || isSending || !draft.trim()}
            onClick={onClickSendButton}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bitcoin text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={18} />
          </button>
          {shouldShowCharacterCount && (
            <p className="font-number text-[10px] leading-4 text-neutral-500">
              {graphemeCount}/{CHAT_MAX_MESSAGE_GRAPHEMES}
            </p>
          )}
        </div>
      </div>

      {(validationMessage || errorMessage || isUncertain || isSending) && (
        <p className="mt-1.5 text-[11px] leading-4 text-neutral-500" aria-live="polite">
          {isSending && "전송 결과를 확인하고 있어요."}
          {isUncertain && "전송 확인이 되지 않았어요. 연결 후 다시 전송할 수 있어요."}
          {errorMessage || validationMessage}
        </p>
      )}
    </footer>
  );
}
