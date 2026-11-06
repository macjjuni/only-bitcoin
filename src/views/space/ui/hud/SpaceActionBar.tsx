"use client";

import { memo, type ReactNode } from "react";

/**
 * HUD 버튼 하나.
 *
 * 버튼이 늘어나도 배치·크기·접근성 처리를 각자 다시 쓰지 않도록 모양을
 * 여기서만 정의함. 추가할 때는 이 타입을 만족하는 항목을 배열에 넣으면 됨.
 */
export interface SpaceHudAction {
  id: string;
  /** 스크린리더 이름이자 툴팁. 아이콘만으로는 뜻이 전달되지 않음. */
  label: string;
  icon: ReactNode;
  /** 토글 버튼이 켜진 상태인지. 누르면 상태가 바뀌는 버튼에만 줌. */
  isActive?: boolean;
  isDisabled?: boolean;
  /** 읽지 않은 수 같은 숫자 배지. 0 이면 표시하지 않음. */
  badgeCount?: number;
  onClick: () => void;
}

interface SpaceActionBarProps {
  actions: readonly SpaceHudAction[];
  /**
   * 가로 정렬. 우측 상단 묶음은 오른쪽, 좌측 하단 버튼은 왼쪽에 붙임.
   *
   * 버튼 모양·배지·접근성 처리를 한 곳에 두려고 좌측 하단 버튼도 이 컴포넌트를
   * 씀. 정렬만 다름.
   */
  align?: "start" | "end";
  /**
   * 버튼 크기. 엄지로 자주 누르는 모바일 채팅 버튼만 `large` 를 씀.
   * 점프·발차기와 같은 52 px(`TOUCH_BUTTON_DIAMETER`)라 바꾸면 같이 바꿔야 함.
   */
  size?: "default" | "large";
}

const BASE_BUTTON_CLASS =
  "relative flex items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-150 disabled:opacity-40";

const BUTTON_SIZE_CLASS = {
  default: "size-10",
  large: "size-[52px]",
} as const;

// region [Privates]
const resolveButtonClassName = (
  action: SpaceHudAction,
  size: keyof typeof BUTTON_SIZE_CLASS,
): string => {
  // 큰 버튼(모바일 채팅)은 같은 줄의 점프·발차기와 같은 반투명 흰색으로 맞춤.
  const idleClassName =
    size === "large"
      ? "border border-white/20 bg-white/10 text-white/85 active:border-bitcoin/70 active:bg-bitcoin/35"
      : "bg-black/55 text-white/85 hover:bg-black/70";
  const toneClassName = action.isActive ? "bg-bitcoin text-black" : idleClassName;

  return `${BASE_BUTTON_CLASS} ${BUTTON_SIZE_CLASS[size]} ${toneClassName}`;
};

const resolveBadgeLabel = (badgeCount: number): string => {
  return badgeCount > 99 ? "99+" : String(badgeCount);
};
// endregion

/** 버튼 묶음. 항목이 늘어나면 세로로 쌓임. */
function SpaceActionBar({
  actions,
  align = "end",
  size = "default",
}: SpaceActionBarProps): ReactNode {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${align === "start" ? "items-start" : "items-end"}`}>
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
          className={resolveButtonClassName(action, size)}
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
