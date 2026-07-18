import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DCA_PERSIST_KEY } from "@/shared/stores/persistKeys";

export type TradeType = "buy" | "sell";

export interface TradeRecord {
  id: string;
  type: TradeType; // 매수/매도 구분
  btcCount: number; // 매매 개수 (BTC, 소수 8자리)
  price: number; // 1BTC당 매매 단가 (KRW)
  date: string; // "YYYY-MM-DD"
  memo?: string; // 메모 (선택)
}

export interface DcaState {
  records: TradeRecord[];
  targetBtcCount: number;
  addRecord: (record: Omit<TradeRecord, "id">) => void;
  updateRecord: (record: TradeRecord) => void;
  removeRecord: (id: string) => void;
  setTargetBtcCount: (targetBtcCount: number) => void;
}

/** persist 대상 상태 (액션 제외). 구버전(v0) 기록에는 type 필드가 없다. */
type DcaPersistedState = {
  records: Array<Omit<TradeRecord, "type"> & { type?: TradeType }>;
  targetBtcCount: number;
};

const useDcaStore = create<DcaState>()(
  persist(
    (set) => ({
      records: [],
      targetBtcCount: 1,
      addRecord: (record) =>
        set((state) => ({
          records: [...state.records, { ...record, id: uuidv4() }],
        })),
      updateRecord: (record) =>
        set((state) => ({
          records: state.records.map((item) => (item.id === record.id ? record : item)),
        })),
      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((item) => item.id !== id),
        })),
      setTargetBtcCount: (targetBtcCount) => set(() => ({ targetBtcCount })),
    }),
    {
      name: DCA_PERSIST_KEY,
      // v1: 매도 기록 지원 (records 에 type 필드 추가, 기존 기록은 모두 매수로 이관)
      version: 1,
      migrate: (persistedState, version) => {
        const state = persistedState as DcaPersistedState;

        if (version < 1) {
          return {
            ...state,
            records: (state.records ?? []).map((record) => ({
              ...record,
              type: record.type ?? "buy",
            })),
          };
        }
        return state;
      },
    },
  ),
);

export default useDcaStore;
