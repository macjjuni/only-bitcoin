import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DCA_PERSIST_KEY } from "@/shared/stores/persistKeys";

export interface PurchaseRecord {
  id: string;
  btcCount: number; // 매수 개수 (BTC, 소수 8자리)
  price: number; // 1BTC당 매수 단가 (KRW)
  date: string; // "YYYY-MM-DD"
}

export interface DcaState {
  records: PurchaseRecord[];
  targetBtcCount: number;
  addRecord: (record: Omit<PurchaseRecord, "id">) => void;
  updateRecord: (record: PurchaseRecord) => void;
  removeRecord: (id: string) => void;
  setTargetBtcCount: (targetBtcCount: number) => void;
}

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
    { name: DCA_PERSIST_KEY },
  ),
);

export default useDcaStore;
