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
}


const NumberField = (props: TextFieldTypes) => {

  // region [Hooks]

  const { value, onChange, unit, readonly = false, className } = props;

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
    document.body.scrollTo({top: 0, behavior: 'smooth'});
    document.body.addEventListener('touchmove', preventEvent, { passive: false });
  }, []);

  const enableScroll = useCallback(() => {
    document.body.removeEventListener('touchmove', preventEvent);
  }, []);

  // endregion


  // region [Events]

  const onChangeInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {

    const text = e.target.value.replace(/,/g, "");
    const isNum = isNumber(text);

    if (text === "") { onChange("0"); }
    if (!isNum) { return; }

    // 앞자리 0 지우기
    const textToNumber = Number(text);
    const numberToText = textToNumber.toString();

    // 콤마 추가
    const numberWithDecimal = comma(numberToText);

    onChange(numberWithDecimal);

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

    if (["KRW", "USD"].includes(unit)) { return { letterSpacing: "-1px" }; }
    if (unit.includes("BTC")) { return { letterSpacing: "0.4px" }; }

    return {};
  }, [unit]);


  // endregion


  // region [Templates]

  const Unit = useMemo(() => (<div className="number-field__unit" style={unitStyle}>{unit || null}</div>),
    [unit]
  );

  // endregion


  return (
    <div className={`number-field${rootClass}`}>
      <input className="number-field__input" value={value} type="text" pattern="\d*" inputMode="decimal"
             onChange={onChangeInput} onFocus={onFocus} onBlur={onBlur} />
      {Unit}
    </div>
  );
};

export default memo(NumberField);
