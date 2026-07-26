import { memo } from "react";

interface NoticeCardProps {
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
  isExiting?: boolean;
  onClickConfirm: () => void;
  onClickDismiss: () => void;
  onClickResetCookie?: () => void;
}

function NoticeCard({ title, message, link, linkLabel, isExiting, onClickConfirm, onClickDismiss, onClickResetCookie }: NoticeCardProps) {
  return (
    <div className={`max-w-[320px] max-[352px]:max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-neutral-900 shadow-lg ring-1  ring-black/20 dark:ring-white/20 overflow-hidden ${isExiting ? "animate-slide-down-fade-out" : "animate-slide-up-fade-in"}`}>
      <div className="px-4 pt-3.5 pb-3">
        <p className="text-md font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
          {title}
        </p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {message}
        </p>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-bitcoin font-medium underline"
          >
            {linkLabel || "자세히 보기"}
          </a>
        )}

        {onClickResetCookie && (
          <button
            type="button"
            onClick={onClickResetCookie}
            className="mt-1.5 ml-2 inline-block text-[11px] text-red-400 hover:text-red-500 cursor-pointer"
          >
            [DEV] 쿠키 초기화
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={onClickDismiss}
          className="px-2 py-1.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        >
          다시 안보기
        </button>
        <button
          type="button"
          onClick={onClickConfirm}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-bitcoin rounded-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          확인
        </button>
      </div>
    </div>
  );
}

export default memo(NoticeCard);
