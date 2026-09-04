"use client";

import {
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogFooter,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
} from "kku-ui";
import type { ChatMessage } from "@/entities/chat-message";
import { truncateGraphemes } from "@/shared/lib/text/countGraphemes";

interface ChatDeleteMessageDialogProps {
  message: ChatMessage | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (messageId: string) => void;
}

const DELETE_PREVIEW_MAXIMUM_GRAPHEMES = 80;

export default function ChatDeleteMessageDialog({
  message,
  isDeleting,
  onCancel,
  onConfirm,
}: ChatDeleteMessageDialogProps) {
  // region [Events]
  const onChangeDeleteDialog = (isOpen: boolean): void => {
    if (!isOpen && !isDeleting) {
      onCancel();
    }
  };

  const onClickCancelButton = (): void => {
    onCancel();
  };

  const onClickConfirmButton = (): void => {
    if (message) {
      onConfirm(message.id);
    }
  };
  // endregion

  if (!message) {
    return null;
  }

  const messagePreview = truncateGraphemes(message.body, DELETE_PREVIEW_MAXIMUM_GRAPHEMES);

  return (
    <KDialog open onOpenChange={onChangeDeleteDialog} blur={2} size="sm">
      <KDialogOverlay className="!z-[120]" />
      <KDialogContent className="!top-[44%] !z-[121] font-pretendard">
        <KDialogHeader>
          <KDialogTitle>메시지를 삭제할까요?</KDialogTitle>
          <KDialogDescription className="text-sm leading-5">
            삭제된 메시지는 채팅에서 즉시 사라지며 되돌릴 수 없습니다.
          </KDialogDescription>
        </KDialogHeader>

        <blockquote className="my-3 rounded-xl bg-neutral-100 p-3 text-xs leading-5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <strong className="block text-neutral-800 dark:text-neutral-100">
            {message.nickname}
          </strong>
          <span className="mt-1 block break-words">{messagePreview}</span>
        </blockquote>

        <KDialogFooter>
          <button
            type="button"
            onClick={onClickCancelButton}
            disabled={isDeleting}
            className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold disabled:opacity-50 dark:border-neutral-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClickConfirmButton}
            disabled={isDeleting}
            className="h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {isDeleting ? "삭제 중" : "삭제"}
          </button>
        </KDialogFooter>
      </KDialogContent>
    </KDialog>
  );
}
