import { memo, ReactNode, useMemo } from "react";
import { KDropdownMenu, KDropdownMenuCheckboxItem, KDropdownMenuContent, KDropdownMenuLabel,
  KDropdownMenuTrigger, KIcon } from "kku-ui";
import { UnitType } from "@/shared/stores/store.interface";
import useStore from "@/shared/stores/store";



export interface UnitDropdownMenuProps {
  currentUnit: UnitType;
  onChangeUnit: (unit: UnitType) => void
}


const UNIT_DISPLAY: Record<UnitType, ReactNode> = {
  KRW: "KRW",
  USD: "USD",
  BTC: "BTC",
  SATS: "Sats"
} as const;


const UnitDropdownMenu = (props: UnitDropdownMenuProps) => {

  // region [Hooks]
  const { currentUnit, onChangeUnit } = props;
  const currency = useStore(state => state.setting.currency);
  const unitList = useMemo(() => ["BTC"].concat(currency.split("/")).concat("SATS"), [currency]) as UnitType[];
  // endregion

  const CurrentLabel = UNIT_DISPLAY[currentUnit] || currentUnit;

  return (
    <KDropdownMenu size="md">
      <KDropdownMenuTrigger className={`flex gap-0.5 items-center rounded-[3px] text-md font-bold px-1 py-[3px]
         bg-neutral-200 dark:bg-neutral-700 data-[state=open]:bg-neutral-300 dark:data-[state=open]:bg-neutral-500
          ${currentUnit === "SATS" && "tracking-[-1.5px] "}`}>
        {CurrentLabel}
        <KIcon icon="keyboard_arrow_down" size={10} />
      </KDropdownMenuTrigger>

      <KDropdownMenuContent className="unit__area__content" side="top" align="end" sideOffset={16}
                            alignOffset={-8}>
        <KDropdownMenuLabel>단위 설정</KDropdownMenuLabel>
        {unitList.map((unitItem) => (
          <KDropdownMenuCheckboxItem key={unitItem} checked={currentUnit === unitItem}
                                     onCheckedChange={() => onChangeUnit(unitItem)}>
            {unitItem === "SATS" ? "Sats" : unitItem}
          </KDropdownMenuCheckboxItem>
        ))}
      </KDropdownMenuContent>
    </KDropdownMenu>
  );
};

const MemoizedUnitDropdownMenu = memo(UnitDropdownMenu);
MemoizedUnitDropdownMenu.displayName = "UnitDropdownMenu";

export default MemoizedUnitDropdownMenu;