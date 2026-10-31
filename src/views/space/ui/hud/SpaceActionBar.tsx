"use client";

import { memo, type ReactNode } from "react";

/**
 * 우측 상단 버튼 하나.
 *
 * 버튼이 늘어나도 배치·크기·접근성 처리를 각자 다시 쓰지 않도록 모양을
 * 여기서만 정의한다. 추가할 때는 이 타입을 만족하는 항목을 배열에 넣으면 된다.
 */
export interface SpaceHudAction {
  id: string;
  /** 스크린리더 이름이자 툴팁. 아이콘만으로는 뜻이 전달되지 않는다. */
  label: string;
  icon: ReactNode;
  /** 토글 버튼이 켜진 상태인지. 누르면 상태가 바뀌는 버튼에만 준다. */
  isActive?: boolean;
  isDisabled?: boolean;
  /** 읽지 않은 수 같은 숫자 배지. 0 이면 표시하지 않는다. */
  badgeCount?: number;
  onClick: () => void;
}

interface SpaceActionBarProps {
  actions: readonly SpaceHudAction[];
}

const BASE_BUTTON_CLASS =
  "relative flex size-10 items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-150 disabled:opacity-40";

// region [Privates]
const resolveButtonClassName = (action: SpaceHudAction): string => {
  const toneClassName = action.isActive
    ? "bg-bitcoin text-black"
    : "bg-black/55 text-white/85 hover:bg-black/70";

  return `${BASE_BUTTON_CLASS} ${toneClassName}`;
};

const resolveBadgeLabel = (badgeCount: number): string => {
  return badgeCount > 99 ? "99+" : String(badgeCount);
};
// endregion

/** 우측 상단 버튼 묶음. 항목이 늘어나면 세로로 쌓인다. */
function SpaceActionBar({ actions }: SpaceActionBarProps): ReactNode {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          id={action.id}
          type="button"
          title={action.label}
          aria-label={action.label}
          aria-pressed={action.isActive}
          disabled={action.isDisabled}
          onClick={action.onClick}
          className={resolveButtonClassName(action)}
        >
          {action.icon}

          {action.badgeCount ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-down px-1 text-[10px] font-bold leading-4 text-white">
              {resolveBadgeLabel(action.badgeCount)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

const MemoizedSpaceActionBar = memo(SpaceActionBar);
MemoizedSpaceActionBar.displayName = "SpaceActionBar";

export default MemoizedSpaceActionBar;
