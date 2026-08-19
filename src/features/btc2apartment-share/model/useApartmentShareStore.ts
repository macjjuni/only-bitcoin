import { create } from "zustand";

interface ApartmentShareStore {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

/**
 * 아파트 공유 카드 다이얼로그의 열림 상태.
 *
 * persist 하지 않는다. 저장할 설정이 없을뿐더러 `isOpen` 이 복원되면
 * 다음 방문에 사용자 조작 없이 모달이 떠버린다.
 */
export const useApartmentShareStore = create<ApartmentShareStore>()((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
