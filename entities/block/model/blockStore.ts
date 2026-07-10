import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStore } from "@/shared/stores/legacyMigration";
import { BLOCK_PERSIST_KEY } from "@/shared/stores/persistKeys";
import { type BlockSlice, createBlockSlice } from "./blockSlice";

export type BlockStoreType = BlockSlice;

// 스토어가 하이드레이트되기 전에 구버전 값을 이관한다. (제거 예정)
migrateLegacyStore();

const useBlockStore = create<BlockStoreType>()(
  persist((...a) => ({ ...createBlockSlice(...a) }), { name: BLOCK_PERSIST_KEY }),
);

export default useBlockStore;
