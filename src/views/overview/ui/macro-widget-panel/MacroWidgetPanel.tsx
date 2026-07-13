"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { KButton, kToast } from "kku-ui";
import { useTransitionRouter } from "next-view-transitions";
import { useEffect, useState } from "react";
import type { InitialBitcoinPrice, MacroIndicators } from "@/entities/bitcoin";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useBitcoinDominanceQuery, useFearGreedIndex } from "@/entities/bitcoin/client";
import { minedPercent, useBlockStore } from "@/entities/block";
import { calcPremiumPercent, usdToSats } from "@/shared/utils/calculate";
import useOverviewStore from "../../model/overviewStore";
import FearAndGreedDialog from "./components/FearAndGreedDialog";
import WidgetItem from "./WidgetItem";

interface MacroVO {
  id: number;
  label: string;
  value: number;
  decimals: number;
  sign: string | null;
  onClick?: () => void;
}

interface MacroWidgetPanelTypes {
  /** SSR 로 미리 조회한 매크로 지표. 클라이언트 쿼리가 갱신하기 전까지의 표시값이다. */
  initialMacro: MacroIndicators;
  /** SSR 로 미리 조회한 시세. Premium / Sats-USD 계산에 필요하다. */
  initialPrice: InitialBitcoinPrice;
}

export default function MacroWidgetPanel({ initialMacro, initialPrice }: MacroWidgetPanelTypes) {
  // region [Hooks]
  const router = useTransitionRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [IsFearAndGreedDialog, setIsFearAndGreedDialog] = useState(false);

  const macroSequence = useOverviewStore((state) => state.macroSequence);
  const setMacroSequence = useOverviewStore((state) => state.setMacroSequence);
  const { krw: socketKrw, usd: socketUsd } = useBitcoinStore((state) => state.bitcoinPrice);
  const storeExRate = useBitcoinStore((state) => state.exRate.value);
  const blockData = useBlockStore((state) => state.blockData);

  /**
   * 소켓/쿼리가 값을 채우기 전(= 서버 렌더링 및 첫 페인트)에는 SSR 값으로 대체한다.
   * 채워지는 즉시 실시간 값이 우선한다.
   */
  const krw = socketKrw || initialPrice.krw;
  const usd = socketUsd || initialPrice.usd;
  const usdExRate = storeExRate || initialMacro.usdExRate;
  const fees = useBlockStore((state) => state.fees);

  /**
   * dnd-kit 센서 설정
   * - 편집 모드 진입 전: 500ms 길게 누르면 드래그 활성화 (iOS 위젯 편집 패턴)
   * - 편집 모드 진입 후: 5px 이동 시 즉시 드래그 활성화 (지연 없이 바로 이동 가능)
   * 짧은 탭은 onClick으로 정상 동작합니다.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isEditMode ? { distance: 5 } : { delay: 500, tolerance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: isEditMode ? { distance: 5 } : { delay: 500, tolerance: 8 },
    }),
  );
  // endregion

  // region [Transactions]
  const dominanceData = useBitcoinDominanceQuery(initialMacro.dominance);
  const fearGreedData = useFearGreedIndex(initialMacro.fearGreedIndex);
  // endregion

  // region [Privates]
  const premium = calcPremiumPercent(krw, usd, usdExRate);

  const onRoutePremiumPage = () => router.push("/premium");

  const onClickOpenFearAndGreedDialog = () => setIsFearAndGreedDialog(true);

  /**
   * 매크로 데이터 리스트 정의
   */
  const macroDataList: MacroVO[] = [
    { id: 1, label: "BTC.D", value: dominanceData, decimals: 1, sign: "%" },
    {
      id: 2,
      label: "KRW/USD",
      value: usdExRate,
      decimals: 1,
      sign: null,
      onClick: onRoutePremiumPage,
    },
    {
      id: 3,
      label: "Premium",
      value: premium,
      decimals: 2,
      sign: "%",
      onClick: onRoutePremiumPage,
    },
    {
      id: 4,
      label: "F&G Index",
      value: fearGreedData,
      decimals: 0,
      sign: null,
      onClick: onClickOpenFearAndGreedDialog,
    },
    {
      id: 5,
      label: "Mined %",
      value: minedPercent(blockData[0]?.height ?? 0),
      decimals: 2,
      sign: "%",
    },
    { id: 6, label: "Sats/USD", value: usdToSats(1, usd), decimals: 0, sign: null },
    { id: 7, label: "Fast Fee", value: fees.fastestFee, decimals: 1, sign: "sat/vB" },
    { id: 8, label: "Eco Fee", value: fees.economyFee, decimals: 1, sign: "sat/vB" },
  ];

  const visibleItems = macroSequence
    .map((id) => macroDataList.find((item) => item.id === id))
    .filter(Boolean) as MacroVO[];

  const unselectedItems = macroDataList.filter((i) => !macroSequence.includes(i.id));
  // endregion

  // region [Events]
  const onClickFinishEdit = () => setIsEditMode(false);

  const onClickEmptySlot = () => setIsEditMode(true);

  /**
   * 길게 눌러 드래그가 시작되면 편집 모드로 진입합니다. (iOS 위젯 편집 패턴)
   */
  const onDragStart = () => {
    if (!isEditMode) setIsEditMode(true);
  };

  /**
   * 위젯 드래그 종료 이벤트 핸들러
   * 위젯 순서를 변경합니다.
   */
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = macroSequence.indexOf(active.id as number);
    const newIndex = macroSequence.indexOf(over.id as number);
    setMacroSequence(arrayMove(macroSequence, oldIndex, newIndex));
  };

  const onClickAddWidget = (id: number) => {
    if (macroSequence.length > 3) {
      kToast.error("최대 4개까지 등록할 수 있어요.", { position: "top-center" });
    } else {
      setMacroSequence([...macroSequence, id]);
    }
  };

  const onClickRemoveWidget = (id: number) => {
    setMacroSequence(macroSequence.filter((v) => v !== id));
  };
  // endregion

  // region [Life Cycles]
  /**
   * 편집 모드 시 스크롤 제어
   * Next.js layout 요소의 overflow를 조작합니다.
   */
  useEffect(() => {
    const layoutElement = document.getElementsByClassName("only-btc__content")[0] as HTMLElement;
    if (!layoutElement) return;

    layoutElement.style.overflow = isEditMode ? "hidden" : "auto";
    return () => {
      layoutElement.style.overflow = "auto";
    };
  }, [isEditMode]);
  // endregion

  return (
    <>
      <div className="flex flex-col my-2">
        {isEditMode && (
          <div className="flex justify-end items-center pb-1">
            <button
              type="button"
              onClick={onClickFinishEdit}
              className="text-primary text-sm font-bold mr-1 px-1"
            >
              저장
            </button>
          </div>
        )}

        <DndContext
          id="macro-widget-dnd"
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          collisionDetection={closestCenter}
        >
          <SortableContext items={macroSequence} strategy={horizontalListSortingStrategy}>
            <div className={`grid grid-cols-4 gap-3 ${isEditMode ? "cursor-pointer mt-3" : ""}`}>
              {visibleItems.map(({ id, label, value, sign, decimals, onClick }) => (
                <div key={id} className="tap-highlight-transparent">
                  <WidgetItem
                    id={id}
                    label={label}
                    value={value}
                    sign={sign}
                    decimals={decimals}
                    onClick={onClick}
                    isEditMode={isEditMode}
                    onRemove={() => onClickRemoveWidget(id)}
                  />
                </div>
              ))}
              {Array.from({ length: 4 - visibleItems.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  onClick={onClickEmptySlot}
                  className="flex justify-center items-center h-[52px] text-[32px] text-border border border-dashed border-muted-foreground rounded-lg cursor-pointer tap-highlight-transparent"
                >
                  +
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {isEditMode && (
          <div className="flex flex-col">
            <h2 className="text-base font-bold py-2 text-primary underline underline-offset-[3px] decoration-1">
              추가 가능 위젯
            </h2>
            <div className="w-[calc(100%+4rem)] -mx-8 px-8 whitespace-nowrap overflow-y-auto scrollbar-hide">
              {unselectedItems.map(({ id, label }) => (
                <KButton
                  key={id}
                  variant="primary"
                  size="sm"
                  onClick={() => onClickAddWidget(id)}
                  className="[&&+&]:ml-4"
                >
                  + {label}
                </KButton>
              ))}
            </div>
          </div>
        )}
      </div>

      <FearAndGreedDialog open={IsFearAndGreedDialog} setOpen={setIsFearAndGreedDialog} />
    </>
  );
}
