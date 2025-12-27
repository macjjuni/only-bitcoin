import { ChangeEvent, memo, ReactNode, useCallback } from 'react';
import {
  KCard,
  KCardContent,
  KCardDescription,
  KCardHeader,
  KCardTitle,
  KIcon,
  KInputGroup,
  KInputGroupInput
} from "kku-ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import PremiumField from "@/pages/btc2fiatPage/components/premiumField/PremiumField";

export interface ConverCardProps {
  inputActive: boolean;
  title: string;
  value: number | string;
  onChange: (value: string) => void;
  maxLength?: number;
  unit: string;
  isPremium: boolean;
  topDescription?: ReactNode;
  bottomDescription?: ReactNode;
}


const ConvertCard = (props: ConverCardProps) => {

  const {
    inputActive,
    title,
    value,
    onChange,
    maxLength = 15,
    unit,
    isPremium,
    topDescription,
    bottomDescription
  } = props;


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
  // <KButton className={`flex justify-end text-lg font-bold text-current pl-1 w-[68px] h-full
  //                         ${false && 'tracking-[-1.5px]'} ${!inputActive && ' pt-4'}`}>
  //   {unit}
  // </KButton>

  return (
    <KCard className="border-border font-number bg-neutral-100/60 dark:bg-neutral-900/60">
      <KCardHeader>
        <KCardTitle>
          <div className="flex justify-between items-center gap-3">
            <span className="text-lg font-default font-bold">{inputActive ? unit : title}</span>
            {
              !inputActive ? (<span className={`flex items-center gap-3 text-3xl ${isPremium && 'text-bitcoin'}`}>
                  {value}
                  <KIcon icon="paste" className="text-black dark:text-white"/>
                </span>)
                :
                (<KInputGroup size="lg" className="h-11 my-1 bg-white">
                  <KInputGroupInput type="text" maxLength={maxLength} value={value} onChange={onChangeInput}
                                    className="font-number text-xl font-bold text-right h-full"/>
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
            <PremiumField/>
          </KCardContent>
        )
      }
    </KCard>
  );
};
// {/*<KCardContent>Content</KCardContent>*/}

const MemoizedConvertCard = memo(ConvertCard);

MemoizedConvertCard.displayName = "ConverCard";

export default MemoizedConvertCard;