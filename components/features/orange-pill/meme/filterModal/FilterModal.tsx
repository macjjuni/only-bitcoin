'use client';

import { memo, useCallback, useEffect, MouseEvent } from "react";

interface FilterModalProps {
  tags: string[];
  selected: string;
  onSelectTag: (tag: string) => void;
  onClose: () => void;
}

const FilterModal = ({ tags, selected, onSelectTag, onClose }: FilterModalProps) => {

  // region [Events]
  const onClickBackdrop = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const onClickTag = useCallback((tag: string) => {
    onSelectTag(tag);
  }, [onSelectTag]);

  const onClickClose = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);
  // endregion

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClickBackdrop}
    >
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            태그 선택
          </h2>
          <button
            type="button"
            onClick={onClickClose}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-neutral-600 dark:text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tag Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tags.map((tag) => {
              const isSelected = tag === selected;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onClickTag(tag)}
                  className={`
                    px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isSelected
                      ? 'bg-[#f7931a] text-white shadow-md scale-105'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-95 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
                    }
                  `}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const MemoizedFilterModal = memo(FilterModal);
MemoizedFilterModal.displayName = "FilterModal";

export default MemoizedFilterModal;
