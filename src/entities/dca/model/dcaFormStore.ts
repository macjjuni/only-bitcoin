import { create } from "zustand";
import type { PurchaseRecord } from "./dcaStore";

export interface DcaFormState {
  isFormOpen: boolean;
  editRecord: PurchaseRecord | null; // null 이면 신규 추가 모드
  openForm: (editRecord?: PurchaseRecord | null) => void;
  closeForm: () => void;
}

/**
 * 매수 기록 추가/수정 다이얼로그 상태 스토어.
 * 페이지 외부(글로벌 플로팅 배너)에서도 다이얼로그를 열 수 있도록 전역으로 관리한다.
 */
const useDcaFormStore = create<DcaFormState>()((set) => ({
  isFormOpen: false,
  editRecord: null,
  openForm: (editRecord = null) => set(() => ({ isFormOpen: true, editRecord })),
  closeForm: () => set(() => ({ isFormOpen: false, editRecord: null })),
}));

export default useDcaFormStore;
