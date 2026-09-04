"use client";

import { Trash2 } from "lucide-react";
import type { ChatMessage } from "@/entities/chat-message";

interface ChatDeleteMessageButtonProps {
  message: ChatMessage;
  onRequestDelete: (message: ChatMessage) => void;
}

export default function ChatDeleteMessageButton({
  message,
  onRequestDelete,
}: ChatDeleteMessageButtonProps) {
  // region [Events]
  const onClickDeleteMessageButton = (): void => {
    onRequestDelete(message);
  };
  // endregion

  return (
    <button
      type="button"
      aria-label="메시지 삭제"
      onClick={onClickDeleteMessageButton}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      <Trash2 size={14} />
    </button>
  );
}
