import { create } from "zustand";

interface HeatmapShareStore {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

/** 히트맵 공유 카드 다이얼로그 열림 상태. 복원되면 모달이 멋대로 떠서 persist 안 함. */
export const useHeatmapShareStore = create<HeatmapShareStore>()((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
