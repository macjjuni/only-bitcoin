import { formatChatDateKey, formatChatDateLabel } from "../lib/chatDate";

interface ChatDateSeparatorProps {
  timestampInMilliseconds: number;
}

export default function ChatDateSeparator({ timestampInMilliseconds }: ChatDateSeparatorProps) {
  // region [Privates]
  const chatDateKey = formatChatDateKey(timestampInMilliseconds);
  const chatDateLabel = formatChatDateLabel(timestampInMilliseconds);
  // endregion

  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      <time
        dateTime={chatDateKey}
        className="shrink-0 text-[11px] font-medium text-neutral-500 dark:text-neutral-400"
      >
        {chatDateLabel}
      </time>
      <span aria-hidden className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}
