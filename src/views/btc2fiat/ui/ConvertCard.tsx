"use client";

import { KButton } from "kku-ui";
import { Copy, X } from "lucide-react";
import {
  type ChangeEvent,
  type ElementType,
  type FocusEvent,
  memo,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import { useCopyOnClick } from "@/shared/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import type { UnitType } from "../model/btc2FiatStore";
import PremiumField from "./PremiumField";
import UnitDropdownMenu from "./UnitDropdownMenu";

export interface ConvertCardProps {
  inputActive: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onChangeUnit: (unit: UnitType) => void;
  maxLength?: number;
  unit: UnitType;
  isPremium: boolean;
  topDescription?: ReactNode;
  bottomDescription?: ReactNode;
}

const ConvertCard = (props: ConvertCardProps) => {
  // region [Hooks]
  const {
    inputActive,
    title,
    value,
    onChange,
    onChangeUnit,
    maxLength = 15,
    unit,
    isPremium,
    topDescription,
    bottomDescription,
  } = props;
  const copyRef = useRef(null);
  const onClickCopy = useCopyOnClick(copyRef);
  // endregion

  // region [Events]
  const onChangeInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value.replace(/,/g, ""); // 콤마 제거
      if (text === "") {
        return onChange("0");
      }
      if (!isNumber(text)) {
        return;
      }

      const numberWithComma = text.includes(".") ? text : comma(parseFloat(text).toString());
      onChange(numberWithComma);
    },
    [onChange],
  );

  const onFocusInput = useCallback((e: FocusEvent<HTMLInputElement>) => {
    const input = e.currentTarget; // 요소를 변수에 캡처
    const { length } = input.value;

    requestAnimationFrame(() => {
      input.setSelectionRange(length, length);
    });
  }, []);

  const onClickClear = useCallback(() => {
    onChange("0");
  }, [onChange]);
  // endregion

  // region [Privates]
  const Shell: ElementType = inputActive ? Card : "div";
  const shellClassName = [
    "font-number",
    !inputActive && "rounded-md text-card-foreground [&>div]:px-2 layout-max:[&>div]:px-4",
  ].join(" ");
  // endregion

  return (
    <Shell className={shellClassName}>
      <CardHeader className="!p-2">
        <CardTitle>
          <div className="flex justify-between items-center gap-4 min-w-0">
            {!inputActive && (
              <span className="text-lg font-default font-bold flex-none">{title}</span>
            )}

            {!inputActive ? (
              <div className="flex items-center gap-1.5 text-3xl min-w-0 flex-1 justify-end">
                <span
                  ref={copyRef}
                  data-copy={value.replace(/,/g, "")}
                  className={`truncate text-right ${isPremium && "text-bitcoin"}`}
                >
                  {value}
                </span>
                <KButton variant="ghost" size="icon" onClick={onClickCopy}>
                  <Copy />
                </KButton>
              </div>
            ) : (
              <InputGroup size="lg" className="h-11 my-1 flex-1">
                {value !== "0" && (
                  <InputGroupAddon align="inline-start" className="pr-1">
                    <X className="cursor-pointer" onClick={onClickClear} />
                  </InputGroupAddon>
                )}
                <InputGroupInput
                  type="text"
                  inputMode="decimal"
                  maxLength={maxLength}
                  value={value}
                  onChange={onChangeInput}
                  onFocus={onFocusInput}
                  className="font-number text-xl font-bold text-right h-full"
                />
                <InputGroupAddon align="inline-end" className="!text-current">
                  <UnitDropdownMenu currentUnit={unit} onChangeUnit={onChangeUnit} />
                </InputGroupAddon>
              </InputGroup>
            )}
          </div>
        </CardTitle>
        {!inputActive && (topDescription || bottomDescription) && (
          <CardDescription className="flex flex-col gap-1.5 text-right text-md text-current">
            {isPremium && topDescription && <span className="font-bold">= {topDescription}</span>}
            {bottomDescription && <span className="font-bold">* {bottomDescription}</span>}
          </CardDescription>
        )}
      </CardHeader>
      {inputActive && (
        <CardContent className="px-2 pb-2.5">
          <PremiumField />
        </CardContent>
      )}
    </Shell>
  );
};

const MemoizedConvertCard = memo(ConvertCard);
MemoizedConvertCard.displayName = "ConvertCard";

export default MemoizedConvertCard;
