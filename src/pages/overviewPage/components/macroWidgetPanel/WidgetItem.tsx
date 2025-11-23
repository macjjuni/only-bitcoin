import { memo, useCallback, useMemo, MouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./WidgetItem.scss";
import { KIcon } from "kku-ui";
import { CountText } from "@/components";

export interface WidgetItemProps {
  id: number;
  label: string;
  value?: number |  "Error";
  sign: string | null;
  decimals: number;
  onClick?: () => void;
  onRemove: () => void;
  isEditMode: boolean;
}

const WidgetItem = ({ id, label, value, sign, decimals, onClick, isEditMode, onRemove }: WidgetItemProps) => {
  const sortableProps = useSortable({ id });
  const { attributes, listeners, setNodeRef, transform, transition } = sortableProps;

  const style = useMemo(() => ({
    transform: isEditMode ? CSS.Transform.toString(transform) : undefined,
    transition: isEditMode ? transition : undefined,
    display: "block"
  }), [isEditMode, transition, transform]);

  // region [Events]
  const onClickWidget = useCallback(() => {
    if (!isEditMode) { onClick?.(); }
  }, [isEditMode, onClick]);

  const onClickRemove = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove();
  }, [onRemove])
  // endregion


  // region [Templates]
  const RemoveButton = useMemo(() => (
    isEditMode && (
      // eslint-disable-next-line jsx-a11y/control-has-associated-label
        <button type="button" className="remove-button" onClick={onClickRemove}
               onPointerDown={(e) => e.stopPropagation()}
               onTouchStart={(e) => e.stopPropagation()}>
          <KIcon icon="close" size={12} color="#fff" />
        </button>)
  ), [isEditMode, onClickRemove])
  // endregion

  return (
    <div ref={setNodeRef} style={style} {...(isEditMode ? { ...attributes, ...listeners } : {})}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div className={["widget-item", isEditMode ? "wiggle" : ""].join(" ")} onClick={onClickWidget}>
        <div className="widget-item__label">{label}</div>
        <div className="widget-item__value">
          {typeof value === "number" && (<><CountText value={value} decimals={decimals} />{sign}</>)}
          {typeof value === "string" && value}
        </div>
        {RemoveButton}
      </div>
    </div>
  );
};

const MemoizedWidgetItem = memo(WidgetItem);
MemoizedWidgetItem.displayName = "WidgetItem";

export default MemoizedWidgetItem;
