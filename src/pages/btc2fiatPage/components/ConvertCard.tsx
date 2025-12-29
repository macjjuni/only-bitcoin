import { ChangeEvent, FocusEvent, memo, ReactNode, useCallback, useRef } from "react";
import {
  KButton,
  KCard,
  KCardContent,
  KCardDescription,
  KCardHeader,
  KCardTitle,
  KInputGroup,
  KInputGroupAddon,
  KInputGroupInput
} from "kku-ui";
import { Copy, X } from "lucide-react";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { PremiumField, UnitDropdownMenu } from "@/pages/btc2fiatPage/components";
import { UnitType } from "@/shared/stores/store.interface";
import { useCopyOnClick } from "@/shared/hooks";

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
    inputActive, title, value, onChange, onChangeUnit, maxLength = 15,
    unit, isPremium, topDescription, bottomDescription
  } = props;
  const copyRef = useRef(null);
  const onClickCopy = useCopyOnClick(copyRef);
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

    const numberWithComma = text.includes(".") ? text : comma(parseFloat(text).toString());
    onChange(numberWithComma);
  }, [onChange]);

  const onFocusInput = useCallback((e: FocusEvent<HTMLInputElement>) => {
    const input = e.currentTarget; // 요소를 변수에 캡처
    const { length } = input.value;

    requestAnimationFrame(() => {
      input.setSelectionRange(length, length);
    });
  }, []);

  const onClickClear = useCallback(() => {
    onChange("0");
  }, []);
  // endregion


  return (
    <KCard className={[
      "border-border font-number bg-neutral-100/60 dark:bg-neutral-900/60",
      !inputActive && " !border-0 !bg-transparent !shadow-none"
    ].filter(Boolean).join(" ")}>
      <KCardHeader>
        <KCardTitle>
          <div className="flex justify-between items-center gap-4 min-w-0">
            {!inputActive && (<span className="text-lg font-default font-bold flex-none">{title}</span>)}

            {!inputActive ? (
              <div className="flex items-center gap-1.5 text-3xl min-w-0 flex-1 justify-end">
                <span ref={copyRef} data-copy={value.replace(/,/g, "")}
                      className={`truncate text-right ${isPremium && "text-bitcoin"}`}>
                  {value}
                </span>
                <KButton variant="ghost" size="icon" onClick={onClickCopy}><Copy /></KButton>
              </div>
            ) : (
              <KInputGroup size="lg" className="h-11 my-1 bg-white flex-1">
                {
                  value !== "0" && (
                    <KInputGroupAddon align="inline-start" className="pr-1">
                      <X className="cursor-pointer" onClick={onClickClear} />
                    </KInputGroupAddon>
                  )
                }
                <KInputGroupInput
                  type="text"
                  inputMode="decimal"
                  maxLength={maxLength}
                  value={value}
                  onChange={onChangeInput}
                  onFocus={onFocusInput}
                  className="font-number text-xl font-bold text-right h-full"
                />
                <KInputGroupAddon align="inline-end" className="!text-current">
                  <UnitDropdownMenu currentUnit={unit} onChangeUnit={onChangeUnit} />
                </KInputGroupAddon>
              </KInputGroup>
            )}
          </div>
        </KCardTitle>
        {
          (!inputActive && (topDescription || bottomDescription)) && (
            <KCardDescription className="flex flex-col gap-1.5 text-right text-md text-current opacity-70">
              {isPremium && <span>= {topDescription}</span>}
              {bottomDescription && <span>* {bottomDescription}</span>}
            </KCardDescription>
          )
        }
      </KCardHeader>
      {
        inputActive && (
          <KCardContent>
            <PremiumField />
          </KCardContent>
        )
      }
    </KCard>
  );
};


const MemoizedConvertCard = memo(ConvertCard);
MemoizedConvertCard.displayName = "ConvertCard";

export default MemoizedConvertCard;