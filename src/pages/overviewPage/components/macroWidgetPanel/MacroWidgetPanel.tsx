import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KButton, kToast } from "kku-ui";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { EditIcon, SaveIcon } from "@/components/ui/icon";
import { useBitcoinDominanceQuery, useFearGreedIndex } from "@/shared/api";
import { calcPremiumPercent, minedPercent, usdToSats } from "@/shared/utils/calculate";
import { FearAndGreedDialog } from "@/components/dialog";
import useStore from "@/shared/stores/store";
import WidgetItem from "./WidgetItem";

interface MacroVO {
  id: number;
  label: string;
  value: number | string;
  decimals: number;
  sign: string | null;
  onClick?: () => void;
}


const MacroWidgetPanel = () => {

  // region [Hooks]
  const macroSequence = useStore(state => state.macroSequence);
  const setMacroSequence = useStore(state => state.setMacroSequence);
  const [isEditMode, setIsEditMode] = useState(false);

  const dominanceData = useBitcoinDominanceQuery();
  const fearGreedData = useFearGreedIndex();

  const {krw, usd} = useStore(state => state.bitcoinPrice);
  const usdExRate = useStore(state => state.exRate.value);
  const blockData = useStore(state => state.blockData);
  const fees = useStore(state => state.fees);

  const premium = useMemo(() => {
    if (usdExRate !== 0) {
      return calcPremiumPercent(krw, usd, usdExRate);
    }
    return "Error";
  }, [krw, usd, usdExRate]);

  const navigate = useNavigate();
  const [IsFearAndGreedDialog, setIsFearAndGreedDialog] = useState(false);

  // endregion


  // region [Privates]
  const enableEditMode = useCallback(() => {
    setIsEditMode(true);
  }, [])
  const toggleEditMode = useCallback(() => {
    setIsEditMode(p => !p);
  }, [])

  const getLayoutElement = useCallback(() =>
          document.getElementsByClassName("only-btc__layout")[0] as HTMLElement
      , []);

  const onScrollDisabled = useCallback(() => {
    const layoutElement = getLayoutElement();
    if (layoutElement instanceof HTMLElement) {
      layoutElement.style.overflowY = "hidden";
    }
  }, []);

  const onScrollActive = useCallback(() => {
    const layoutElement = getLayoutElement();
    if (layoutElement instanceof HTMLElement) {
      layoutElement.style.overflowY = "auto";
    }
  }, []);

  const onRoutePremiumPage = useCallback(() => {
    navigate("/premium");
  }, []);

  const getEmptyElement = useCallback((length: number) => {
    const emptyCount = 4 - length;
    if (emptyCount <= 0) return null;
    return Array.from({ length: emptyCount }, (_, index) => (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
      <div key={`empty-${index}`} onClick={enableEditMode}
        className="flex justify-center items-center relative h-[52px] text-[32px] text-border border border-dashed border-muted-foreground
         rounded-lg cursor-pointer tap-highlight-transparent">
        +
      </div>
    ));
  }, []);
  // endregion


  // region [Events]
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!isEditMode) return;

    const {active, over} = event;
    if (!over || active.id === over.id) return;

    const oldIndex = macroSequence.indexOf(active.id as number);
    const newIndex = macroSequence.indexOf(over.id as number);
    setMacroSequence(arrayMove(macroSequence, oldIndex, newIndex));
  }, [isEditMode, macroSequence]);

  const onClickAddWidget = useCallback((id: number) => {
    if (macroSequence.length > 3) {
      kToast.error("최대 4개까지 등록할 수 있어요.");
    } else {
      setMacroSequence([...macroSequence, id]);
    }
  }, [macroSequence]);

  const onClickRemoveWidget = useCallback((id: number) => {
    const removedList = macroSequence.filter(v => v !== id);
    setMacroSequence(removedList);
  }, [macroSequence]);

  const onChangeOpenFearAndGreedDialog = useCallback((val: boolean) => {
    setIsFearAndGreedDialog(val);
  }, []);

  const onOpenFearAndGreedDialog = useCallback(() => {
    setIsFearAndGreedDialog(true);
  }, []);
  // endregion


  // region [Templates]
  const macroDataList = useMemo((): MacroVO[] => ([
    {id: 1, label: "BTC.D", value: dominanceData, decimals: 1, sign: "%", onClick: undefined},
    {id: 2, label: "KRW/USD", value: usdExRate, decimals: 0, sign: null, onClick: onRoutePremiumPage},
    {id: 3, label: "Premium", value: premium, decimals: 2, sign: "%", onClick: onRoutePremiumPage},
    {id: 4, label: "F&G Index", value: fearGreedData, decimals: 0, sign: null, onClick: onOpenFearAndGreedDialog},
    {id: 5, label: "Mined %", value: minedPercent(blockData[0].height), decimals: 2, sign: "%", onClick: undefined},
    {id: 6, label: "Sats/USD", value: usdToSats(1, usd), decimals: 0, sign: null, onClick: undefined},
    {id: 7, label: "Fast Fee", value: fees.fastestFee, decimals: 1, sign: 'sat/vB', onClick: undefined},
    {id: 8, label: "Eco Fee", value: fees.economyFee, decimals: 1, sign: 'sat/vB', onClick: undefined},
  ]), [dominanceData, usdExRate, premium, fearGreedData, blockData, usd, fees]);


  const visibleItems = useMemo(() => (
      macroSequence.map(id => macroDataList.find(item => item.id === id)).filter(Boolean) as MacroVO[]
  ), [macroSequence, macroDataList]);

  const unselectedItems = useMemo(() => macroDataList.filter(i => !macroSequence.includes(i.id)), [macroSequence, macroDataList]);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    if (isEditMode) {
      onScrollDisabled();
    } else {
      onScrollActive();
    }

    return () => {
      onScrollActive();
    };
  }, [isEditMode]);
  // endregion


  return (
    <>
      {/* .macro-widget__panel */}
      <div className="flex flex-col mb-2 -mt-1">

        {/* .macro-widget__panel__top */}
        <div className="flex justify-end items-center pb-1">
          <button type="button" onClick={toggleEditMode} className="text-current mr-1">
            {isEditMode ? <SaveIcon size={22}/> : <EditIcon size={22}/>}
          </button>
        </div>

        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
          <SortableContext items={macroSequence} strategy={horizontalListSortingStrategy}>
            {/* .macro-widget__panel__middle */}
            <div className={`grid grid-cols-4 gap-4 ${isEditMode ? "cursor-pointer mt-2" : ""}`}>
              {visibleItems.map(({id, label, value, sign, decimals, onClick}) => (
                <div key={id} className="tap-highlight-transparent">
                  <WidgetItem
                    id={id} label={label} value={value} sign={sign} decimals={decimals}
                    onClick={onClick} isEditMode={isEditMode}
                    onRemove={() => onClickRemoveWidget(id)}
                  />
                </div>
              ))}
              {getEmptyElement(visibleItems.length)}
            </div>
          </SortableContext>
        </DndContext>

        {/* .macro-widget__panel__bottom */}
        {isEditMode && (
          <div className="flex flex-col">
            <h2 className="text-base font-bold py-2 text-primary underline underline-offset-[3px] decoration-1">추가 가능 위젯</h2>

            {/* .macro-widget__panel__bottom-list */}
            <div className="w-[calc(100%+4rem)] -mx-8 px-8 whitespace-nowrap overflow-y-auto scrollbar-hide">
                {unselectedItems.map(({id, label}) => (
                  <KButton key={id} variant="primary" size="sm" onClick={() => onClickAddWidget(id)} className="[&&+&]:ml-2">
                    + {label}
                  </KButton>
                ))}
            </div>
          </div>
        )}
      </div>

      <FearAndGreedDialog open={IsFearAndGreedDialog} setOpen={onChangeOpenFearAndGreedDialog}/>
    </>
  );
};

const MemoizedMacroWidgetPanel = memo(MacroWidgetPanel);
MemoizedMacroWidgetPanel.displayName = "MacroWidgetPanel";

export default MemoizedMacroWidgetPanel;
