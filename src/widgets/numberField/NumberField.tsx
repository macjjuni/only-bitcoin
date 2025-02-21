import React, { ChangeEvent, memo, ReactNode, useCallback, useMemo } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import "./NumberField.scss";


interface TextFieldTypes extends ComponentBaseTypes {
  value: string;
  onChange: (value: string) => void;
  unit: ReactNode;
  readonly?: boolean;
  leftAction?: ReactNode;
}


const NumberField = (props: TextFieldTypes) => {

  // region [Hooks]

  const { value, onChange, unit, readonly = false, className, leftAction } = props;

  // endregion


  // region [Styles]

  const rootClass = useMemo(() => {

    const clazz = [" "];

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

    if (text === "") {
      return onChange("0");
    }
    if (!isNumber(text)) {
      return;
    }

    // `12.` 같은 경우 숫자로 변환하면 `12`가 되어버리므로 그대로 유지해야 함
    const numberWithComma = text.includes(".") ? text : comma(parseFloat(text).toString());

    onChange(numberWithComma);
  }, [onChange]);

  const onFocus = useCallback(() => {
    disableScroll();
  }, []);

  const onBlur = useCallback(() => {
    enableScroll();
  }, []);

  // endregion


  // region [Styles]

  const unitStyle = useMemo(() => {

    if (typeof unit !== "string") { return {}; }
    if (unit.includes("KRW")) { return { letterSpacing: "-1px" }; }
    if (unit.includes("USD")) { return { letterSpacing: "0" }; }
    if (unit.includes("BTC")) { return { letterSpacing: "0.2px" }; }

    return {};
  }, [unit]);

  // endregion


  // region [Templates]

  const LeftAction = useMemo(()=> (
    leftAction ? <div className="number-field__left-action">{leftAction}</div> : null
  ),[leftAction])

  const Unit = useMemo(() => (
    unit ? <div className="number-field__unit" style={unitStyle}>{unit}</div> : null
  ), [unit]);

  // endregion


  return (
    <div className={`number-field${rootClass}`}>
      {LeftAction}
      <input className="number-field__input" value={value} type="text" pattern="\d*" inputMode="decimal"
             onChange={onChangeInput} onFocus={onFocus} onBlur={onBlur} readOnly={readonly} />
      {Unit}
    </div>
  );
};

export default memo(NumberField);
