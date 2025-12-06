import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { KButton } from "kku-ui";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { EditIcon, SaveIcon } from "@/components/ui/icon";
import { useBitcoinDominanceQuery, useFearGreedIndex } from "@/shared/api";
import { calcPremiumPercent, minedPercent, usdToSats } from "@/shared/utils/calculate";
import { FearAndGreedModal } from "@/components/modal";
import useStore from "@/shared/stores/store";
import WidgetItem from "./WidgetItem";
import "./MacroWidgetPanel.scss";

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

  const { krw, usd } = useStore(state => state.bitcoinPrice);
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
  const [IsFearAndGreedModal, setIsFearAndGreedModal] = useState(false);

  // endregion


  // region [Privates]
  const enableEditMode = useCallback(() => { setIsEditMode(true); }, [])
  const toggleEditMode = useCallback(() => { setIsEditMode(p => !p); }, [])

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
      <div key={`empty-${index}`} className="macro-widget__panel__empty" onClick={enableEditMode}>+</div>
    ));
  }, []);
  // endregion


  // region [Events]
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!isEditMode) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = macroSequence.indexOf(active.id as number);
    const newIndex = macroSequence.indexOf(over.id as number);
    setMacroSequence(arrayMove(macroSequence, oldIndex, newIndex));
  }, [isEditMode, macroSequence]);

  const onClickAddWidget = useCallback((id: number) => {
    if (macroSequence.length > 3) {
      toast.error("최대 4개까지 등록할 수 있어요.");
    } else {
      setMacroSequence([...macroSequence, id]);
    }
  }, [macroSequence]);

  const onClickRemoveWidget = useCallback((id: number) => {
    const removedList = macroSequence.filter(v => v !== id);
    setMacroSequence(removedList);
  }, [macroSequence]);

  const onCloseFearAndGreedModal = useCallback(() => {
    setIsFearAndGreedModal(false);
  }, []);

  const onOpenFearAndGreedModal = useCallback(() => {
    setIsFearAndGreedModal(true);
  }, []);
  // endregion


  // region [Templates]
  const macroDataList = useMemo((): MacroVO[] => ([
    { id: 1, label: "BTC.D", value: dominanceData, decimals: 1, sign: "%", onClick: undefined },
    { id: 2, label: "KRW/USD", value: usdExRate, decimals: 0, sign: null, onClick: onRoutePremiumPage },
    { id: 3, label: "Premium", value: premium, decimals: 2, sign: "%", onClick: onRoutePremiumPage },
    { id: 4, label: "F&G Index", value: fearGreedData, decimals: 0, sign: null, onClick: onOpenFearAndGreedModal },
    { id: 5, label: "Mined %", value: minedPercent(blockData[0].height), decimals: 2, sign: "%", onClick: undefined },
    { id: 6, label: "Sats/USD", value: usdToSats(1, usd), decimals: 0, sign: null, onClick: undefined },
    { id: 7, label: "Fast Fee", value: fees.fastestFee, decimals: 1, sign: 'sat/vB', onClick: undefined },
    { id: 8, label: "Eco Fee", value: fees.economyFee, decimals: 1, sign: 'sat/vB', onClick: undefined },
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

    return () => { onScrollActive(); };
  }, [isEditMode]);
  // endregion


  return (
    <>
      <div className="macro-widget__panel">
        <div className="macro-widget__panel__top">
          <button type="button" onClick={toggleEditMode} style={{ color: "currentColor" }}>
            {isEditMode ? <SaveIcon size={22} /> : <EditIcon size={22} />}
          </button>
        </div>

        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
          <SortableContext items={macroSequence} strategy={horizontalListSortingStrategy}>
            <div className={`macro-widget__panel__middle${isEditMode ? " editable" : ""}`}>
              {visibleItems.map(({ id, label, value, sign, decimals, onClick }) =>
                <WidgetItem key={id} id={id} label={label} value={value} sign={sign} decimals={decimals}
                            onClick={onClick} isEditMode={isEditMode} onRemove={() => {
                  onClickRemoveWidget(id);
                }} />)}
              {getEmptyElement(visibleItems.length)}
            </div>
          </SortableContext>
        </DndContext>

        {isEditMode && (
          <div className="macro-widget__panel__bottom">
            <h2 className="macro-widget__panel__bottom__title">추가 가능 위젯</h2>
            <div className="macro-widget__panel__bottom-list">
              {unselectedItems.map(({ id, label }) => (
                <KButton key={id} variant="primary" size="small" onClick={() => {
                  onClickAddWidget(id);
                }}>+ {label}</KButton>
              ))}
            </div>
          </div>
        )}
      </div>
      <FearAndGreedModal isOpen={IsFearAndGreedModal} onClose={onCloseFearAndGreedModal} />
    </>
  );
};

const MemoizedMacroWidgetPanel = memo(MacroWidgetPanel);
MemoizedMacroWidgetPanel.displayName = "MacroWidgetPanel";

export default MemoizedMacroWidgetPanel;
