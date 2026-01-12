'use client'

import { useEffect, useState } from 'react'
import { useTransitionRouter } from 'next-view-transitions'
import { KButton, kToast } from 'kku-ui'
import { arrayMove, horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { closestCenter, DndContext, DragEndEvent } from '@dnd-kit/core'
import { EditIcon, SaveIcon } from '@/components/ui/icon'
import { useBitcoinDominanceQuery, useFearGreedIndex } from '@/shared/api'
import { calcPremiumPercent, minedPercent, usdToSats } from '@/shared/utils/calculate'
import { FearAndGreedDialog } from '@/components/alarm'
import useStore from '@/shared/stores/store'
import WidgetItem from './WidgetItem'

interface MacroVO {
  id: number;
  label: string;
  value: number;
  decimals: number;
  sign: string | null;
  onClick?: () => void;
}

export default function MacroWidgetPanel() {
  const router = useTransitionRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const [IsFearAndGreedDialog, setIsFearAndGreedDialog] = useState(false)

  const macroSequence = useStore((state) => state.macroSequence)
  const setMacroSequence = useStore((state) => state.setMacroSequence)
  const { krw, usd } = useStore((state) => state.bitcoinPrice)
  const usdExRate = useStore((state) => state.exRate.value)
  const blockData = useStore((state) => state.blockData)
  const fees = useStore((state) => state.fees)

  const dominanceData = useBitcoinDominanceQuery()
  const fearGreedData = useFearGreedIndex()

  // 변수 계산 (useMemo 제거)
  const premium = calcPremiumPercent(krw, usd, usdExRate)

  // Actions
  const toggleEditMode = () => setIsEditMode((p) => !p)
  const onRoutePremiumPage = () => router.push('/premium')

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isEditMode) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = macroSequence.indexOf(active.id as number)
    const newIndex = macroSequence.indexOf(over.id as number)
    setMacroSequence(arrayMove(macroSequence, oldIndex, newIndex))
  }

  const onClickAddWidget = (id: number) => {
    if (macroSequence.length > 3) {
      kToast.error('최대 4개까지 등록할 수 있어요.', { position: 'top-center' })
    } else {
      setMacroSequence([...macroSequence, id])
    }
  }

  const onClickRemoveWidget = (id: number) => {
    setMacroSequence(macroSequence.filter((v) => v !== id))
  }

  // Data List 정의
  const macroDataList: MacroVO[] = [
    { id: 1, label: 'BTC.D', value: dominanceData, decimals: 1, sign: '%' },
    { id: 2, label: 'KRW/USD', value: usdExRate, decimals: 0, sign: null, onClick: onRoutePremiumPage },
    { id: 3, label: 'Premium', value: premium, decimals: 2, sign: '%', onClick: onRoutePremiumPage },
    {
      id: 4,
      label: 'F&G Index',
      value: fearGreedData,
      decimals: 0,
      sign: null,
      onClick: () => setIsFearAndGreedDialog(true),
    },
    { id: 5, label: 'Mined %', value: minedPercent(blockData[0].height), decimals: 2, sign: '%' },
    { id: 6, label: 'Sats/USD', value: usdToSats(1, usd), decimals: 0, sign: null },
    { id: 7, label: 'Fast Fee', value: fees.fastestFee, decimals: 1, sign: 'sat/vB' },
    { id: 8, label: 'Eco Fee', value: fees.economyFee, decimals: 1, sign: 'sat/vB' },
  ]

  const visibleItems = macroSequence
    .map((id) => macroDataList.find((item) => item.id === id))
    .filter(Boolean) as MacroVO[]

  const unselectedItems = macroDataList.filter((i) => !macroSequence.includes(i.id))

  // Scroll 제어 (Next.js layout 대응)
  useEffect(() => {
    const layoutElement = document.getElementsByClassName('only-btc__content')[0] as HTMLElement
    if (!layoutElement) return

    layoutElement.style.overflow = isEditMode ? 'hidden' : 'auto'
    return () => {
      layoutElement.style.overflow = 'auto'
    }
  }, [isEditMode])

  return (
    <>
      <div className="flex flex-col mb-2 -mt-1">
        <div className="flex justify-end items-center pb-1">
          <button type="button" onClick={toggleEditMode} className="text-current mr-1">
            {isEditMode ? <SaveIcon size={22}/> : <EditIcon size={22}/>}
          </button>
        </div>

        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
          <SortableContext items={macroSequence} strategy={horizontalListSortingStrategy}>
            <div className={`grid grid-cols-4 gap-3 ${isEditMode ? 'cursor-pointer mt-2' : ''}`}>
              {visibleItems.map(({ id, label, value, sign, decimals, onClick }) => (
                <div key={id} className="tap-highlight-transparent">
                  <WidgetItem
                    id={id} label={label} value={value} sign={sign} decimals={decimals}
                    onClick={onClick} isEditMode={isEditMode}
                    onRemove={() => onClickRemoveWidget(id)}
                  />
                </div>
              ))}
              {Array.from({ length: 4 - visibleItems.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  onClick={() => setIsEditMode(true)}
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
                <KButton key={id} variant="primary" size="sm" onClick={() => onClickAddWidget(id)}
                         className="[&&+&]:ml-4">
                  + {label}
                </KButton>
              ))}
            </div>
          </div>
        )}
      </div>

      <FearAndGreedDialog open={IsFearAndGreedDialog} setOpen={setIsFearAndGreedDialog}/>
    </>
  )
}