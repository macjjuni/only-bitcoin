import { ChangeEvent, forwardRef, memo, ReactNode, Ref, useCallback, useMemo, useRef } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import "./NumberField.scss";


export interface TextFieldTypes extends ComponentBaseTypes {
  value: string;
  onChange: (value: string) => void;
  unit: ReactNode;
  readonly?: boolean;
  leftAction?: ReactNode;
  maxLength?: number;
  dataCopy?: string;
  onClick?: () => void;
}


const NumberField = forwardRef((props: TextFieldTypes, ref: Ref<HTMLInputElement>) => {

  // region [Hooks]

  const { value, onChange, unit, readonly = false, className,
    leftAction, maxLength, dataCopy, onClick } = props;
  const isFocus = useRef(false);

  // endregion


  // region [Styles]

  const rootClass = useMemo(() => {

    const clazz = ["number-field"];

    if (className) { clazz.push(className); }
    if (readonly) { clazz.push("number-field--readonly"); }

    return clazz.join(" ");
  }, [className, readonly]);

  // endregion


  // region [Privates]

  const preventEvent = useCallback((e: UIEvent) => { e.preventDefault(); }, []);

  const disableScroll = useCallback(() => {
    document.body.addEventListener("touchmove", preventEvent, { passive: false });
  }, []);

  const enableScroll = useCallback(() => {
    document.body.removeEventListener("touchmove", preventEvent);
  }, []);

  // endregion


  // region [Events]

  const onChangeInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {

    const text = e.target.value.replace(/,/g, ""); // 콤마 제거

    if (text === "") { return onChange("0"); }
    if (!isNumber(text)) { return; }

    // `12.` 같은 경우 숫자로 변환하면 `12`가 되어버리므로 그대로 유지해야 함
    const numberWithComma = text.includes(".") ? text : comma(parseFloat(text).toString());

    onChange(numberWithComma);
  }, [onChange]);

  const onClickInput = useCallback(() => {

    if (readonly) { onClick?.(); }

    if (!isFocus.current) {
      isFocus.current = true;

      if (typeof ref === 'function') { return; }

      const inputRef = ref?.current;
      if (inputRef) { inputRef.setSelectionRange(inputRef.value.length, inputRef.value.length); }
    }
  }, [onClick, readonly, ref]);

  const onFocus = useCallback(() => {
    disableScroll();
  }, []);

  const onBlur = useCallback(() => {
    isFocus.current = false;
    enableScroll();
  }, []);

  // endregion


  // region [Templates]

  const LeftAction = useMemo(()=> (
    leftAction ? <div className="number-field__left-action">{leftAction}</div> : null
  ),[leftAction])

  const Unit = useMemo(() => (
    unit ? <div className="number-field__unit">{unit}</div> : null
  ), [unit]);

  // endregion


  return (
    <div className={rootClass}>
      {LeftAction}
      <input ref={ref} className="number-field__input" type="text" value={value} onChange={onChangeInput}
             pattern="\d*" inputMode="decimal" data-copy={dataCopy} onFocus={onFocus} onBlur={onBlur}
             onClick={onClickInput} readOnly={readonly} maxLength={maxLength} />
      {Unit}
    </div>
  );
});

const MemoizedNumberField = memo(NumberField);
NumberField.displayName = "NumberField";
MemoizedNumberField.displayName = "NumberField";

export default MemoizedNumberField;
