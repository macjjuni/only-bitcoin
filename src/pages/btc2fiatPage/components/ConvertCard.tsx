import { ChangeEvent, memo, ReactNode, useCallback } from "react";
import {
  KCard,
  KCardContent,
  KCardDescription,
  KCardHeader,
  KCardTitle,
  KIcon,
  KInputGroup, KInputGroupAddon,
  KInputGroupInput
} from "kku-ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import PremiumField from "@/pages/btc2fiatPage/components/premiumField/PremiumField";
import UnitDropdownMenu from "@/pages/btc2fiatPage/components/UnitDropdownMenu";
import { UnitType } from "@/shared/stores/store.interface";

export interface ConvertCardProps {
  inputActive: boolean;
  title: string;
  value: number | string;
  onChange: (value: string) => void;
  onChangeUnit: (unit: UnitType) => void;
  maxLength?: number;
  unit: UnitType;
  isPremium: boolean;
  topDescription?: ReactNode;
  bottomDescription?: ReactNode;
}


const ConvertCard = (props: ConvertCardProps) => {

  const {
    inputActive, title, value, onChange, onChangeUnit, maxLength = 15,
    unit, isPremium, topDescription, bottomDescription
  } = props;


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


  return (
    <KCard className="border-border font-number bg-neutral-100/60 dark:bg-neutral-900/60">
      <KCardHeader>
        <KCardTitle>
          <div className="flex justify-between items-center gap-4">
            {!inputActive && (<span className="text-lg font-default font-bold">{title}</span>)}

            {
              !inputActive ? (<span className={`flex items-center gap-3 text-3xl ${isPremium && "text-bitcoin"}`}>
                  {value}
                  <KIcon icon="paste" className="text-black dark:text-white" />
                </span>)
                :
                (<KInputGroup size="lg" className="h-11 my-1 bg-white">
                  <KInputGroupInput type="text" maxLength={maxLength} value={value} onChange={onChangeInput}
                                    className="font-number text-xl font-bold text-right h-full" />
                  <KInputGroupAddon align="inline-end" className="!text-current">
                    <UnitDropdownMenu currentUnit={unit} onChangeUnit={onChangeUnit} />
                  </KInputGroupAddon>
                </KInputGroup>)
            }
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