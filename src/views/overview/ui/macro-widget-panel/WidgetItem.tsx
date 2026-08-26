"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KIcon } from "kku-ui";
import { type MouseEvent, useMemo } from "react";
import { CountText } from "@/shared/ui";

export interface WidgetItemProps {
  id: number;
  label: string;
  value: number;
  sign: string | null;
  decimals: number;
  onClick?: () => void;
  onRemove: () => void;
  isEditMode: boolean;
}

export default function WidgetItem({
  id,
  label,
  value,
  sign,
  decimals,
  onClick,
  isEditMode,
  onRemove,
}: WidgetItemProps) {
  // region [Hooks]
  // `roleDescription` 기본값이 영어 "sortable" 이라 한국어로 바꿈.
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    attributes: { roleDescription: "순서를 바꿀 수 있는 위젯" },
  });

  const style = useMemo(
    () => ({
      transform: isEditMode ? CSS.Transform.toString(transform) : undefined,
      transition: isEditMode ? transition : undefined,
      display: "block",
    }),
    [isEditMode, transition, transform],
  );
  // endregion

  // region [Styles]
  const widgetClass = useMemo(
    () =>
      [
        "relative flex flex-col gap-1 p-0.5 select-none tap-highlight-transparent",
        isEditMode ? "animate-wiggle" : "",
        onClick ? "cursor-pointer" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [isEditMode, onClick],
  );
  // endregion

  // region [Events]
  const onClickWidget = () => {
    if (!isEditMode) onClick?.();
  };

  const onClickRemove = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove();
  };
  // endregion

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={widgetClass} onClick={onClickWidget}>
        {/* Label Area */}
        <div className="text-[15px] opacity-70 tracking-[-1px]">{label}</div>

        {/* Value Area */}
        <div className="font-number text-xl font-bold">
          <CountText value={value} decimals={decimals} />
          <span className="text-base font-bold ml-0.5">{sign}</span>
        </div>

        {/* Remove Button */}
        {isEditMode && (
          <button
            type="button"
            // 안에 아이콘뿐이라 이름이 없음. 없으면 스크린 리더가 "버튼" 이라고만 읽음.
            aria-label={`${label} 위젯 삭제`}
            className="absolute -top-2 -right-[3px] flex justify-center items-center w-6 h-6 rounded-full bg-red-500"
            onClick={onClickRemove}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <KIcon icon="close" size={12} color="#fff" />
          </button>
        )}
      </div>
    </div>
  );
}
