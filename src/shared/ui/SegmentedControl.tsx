"use client";

import type { ReactNode } from "react";

export interface SegmentedControlOption<T extends string> {
  label: ReactNode;
  value: T;
  activeClassName?: string; // 활성 시 기본 흰색 칩 대신 적용할 스타일 (예: bg-up/15 text-up)
}

export interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

const DEFAULT_ACTIVE_STYLE = "bg-white shadow-sm dark:bg-neutral-600 text-foreground";

const SIZE_STYLES: Record<NonNullable<SegmentedControlProps<string>["size"]>, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
};

/**
 * iOS 세그먼트 컨트롤 스타일의 선택 UI.
 * hover 스타일이 없는 순수 button 기반이라 터치 기기의 sticky hover 잔상이 생기지 않는다.
 */
const SegmentedControl = <T extends string>(props: SegmentedControlProps<T>) => {
  const { options, value, onChange, size = "md", className } = props;

  return (
    <div
      className={[
        "grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-neutral-200/70 p-1 dark:bg-neutral-800",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`rounded-md font-default font-bold transition-colors active:scale-[0.97] ${
            SIZE_STYLES[size]
          } ${
            value === option.value
              ? (option.activeClassName ?? DEFAULT_ACTIVE_STYLE)
              : "text-muted-foreground"
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
