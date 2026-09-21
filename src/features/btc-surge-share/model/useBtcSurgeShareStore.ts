import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BTC_SURGE_SHARE_PERSIST_KEY } from "@/shared/stores/persistKeys";
import {
  DEFAULT_SHARE_CARD_LAYOUT,
  normalizeShareCardLayout,
  type ShareCardLayout,
} from "./shareCardLayout";
import { SHARE_CARD_TIMEFRAME_LIST, type ShareCardTimeframe } from "./shareCardTimeframe";

const DEFAULT_TIMEFRAME: ShareCardTimeframe = "1D";

interface BtcSurgeShareStore {
  isOpen: boolean;
  timeframe: ShareCardTimeframe;
  /** 다이얼로그가 열린 채로 전환할 수 있는 카드 레이아웃 */
  layout: ShareCardLayout;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  setTimeframe: (timeframe: ShareCardTimeframe) => void;
  setLayout: (layout: ShareCardLayout) => void;
}

/**
 * 저장된 타임프레임이 현재 지원 목록에 있는지 확인한다.
 *
 * 목록에서 제거된 구버전 값이 복원되면 `SHARE_CARD_TIMEFRAME_INTERVAL_MAP` 조회가 `undefined` 가 되고
 * 차트 쿼리가 인터벌 없이 실행되므로, 알 수 없는 값은 기본값으로 되돌린다.
 */
function normalizeTimeframe(timeframe: unknown): ShareCardTimeframe {
  return SHARE_CARD_TIMEFRAME_LIST.includes(timeframe as ShareCardTimeframe)
    ? (timeframe as ShareCardTimeframe)
    : DEFAULT_TIMEFRAME;
}

export const useBtcSurgeShareStore = create<BtcSurgeShareStore>()(
  persist(
    (set) => ({
      isOpen: false,
      timeframe: DEFAULT_TIMEFRAME,
      layout: DEFAULT_SHARE_CARD_LAYOUT,
      openModal: () => set({ isOpen: true }),
      closeModal: () => set({ isOpen: false }),
      toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
      setTimeframe: (timeframe) => set({ timeframe }),
      setLayout: (layout) => set({ layout }),
    }),
    {
      name: BTC_SURGE_SHARE_PERSIST_KEY,
      /**
       * 마지막으로 고른 기간과 레이아웃만 저장한다.
       *
       * `isOpen` 까지 저장하면 다이얼로그가 열린 채로 새로고침했을 때 다음 방문에서
       * 사용자 조작 없이 모달이 떠버린다.
       */
      partialize: (state) => ({ timeframe: state.timeframe, layout: state.layout }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        timeframe: normalizeTimeframe((persistedState as Partial<BtcSurgeShareStore>)?.timeframe),
        layout: normalizeShareCardLayout((persistedState as Partial<BtcSurgeShareStore>)?.layout),
      }),
    },
  ),
);
