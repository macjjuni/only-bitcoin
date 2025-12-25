import { memo, useCallback, useMemo, MouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KIcon } from "kku-ui";
import { CountText } from "@/components";

export interface WidgetItemProps {
  id: number;
  label: string;
  value?: number | string;
  sign: string | null;
  decimals: number;
  onClick?: () => void;
  onRemove: () => void;
  isEditMode: boolean;
}

const WidgetItem = ({ id, label, value, sign, decimals, onClick, isEditMode, onRemove }: WidgetItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = useMemo(() => ({
    transform: isEditMode ? CSS.Transform.toString(transform) : undefined,
    transition: isEditMode ? transition : undefined,
    display: "block"
  }), [isEditMode, transition, transform]);

  const widgetClass = useMemo(() => (
    [
      "relative flex flex-col gap-0.5 p-1 select-none tap-highlight-transparent",
      isEditMode ? "animate-wiggle" : "",
      onClick ? "cursor-pointer" : ""
    ].filter(Boolean).join(" ")
  ), [isEditMode, onClick]);

  const onClickWidget = useCallback(() => {
    if (!isEditMode) onClick?.();
  }, [isEditMode, onClick]);

  const onClickRemove = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove();
  }, [onRemove]);

  return (
    <div ref={setNodeRef} style={style} {...(isEditMode ? { ...attributes, ...listeners } : {})}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div className={widgetClass} onClick={onClickWidget}>

        {/* Label Area */}
        <div className="text-[15px] opacity-70 tracking-[-1px]">
          {label}
        </div>

        {/* Value Area */}
        <div className="font-number text-xl font-bold">
          {typeof value === "number" && (
            <>
              <CountText value={value} decimals={decimals} />
              <span className="text-base font-bold ml-0.5">{sign}</span>
            </>
          )}
          {typeof value === "string" && value}
        </div>

        {/* Remove Button */}
        {isEditMode && (
          <button
            type="button"
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
};

const MemoizedWidgetItem = memo(WidgetItem);

MemoizedWidgetItem.displayName = "WidgetItem";
WidgetItem.displayName = "WidgetItem";

export default MemoizedWidgetItem;