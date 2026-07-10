import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStore } from "@/shared/stores/legacyMigration";
import { BITCOIN_PERSIST_KEY } from "@/shared/stores/persistKeys";
import { type ChartSlice, createChartSlice } from "./chartSlice";
import { createExRateSlice, type ExRateSlice } from "./exRateSlice";
import { createMacroSlice, type MacroSlice } from "./macroSlice";
import { createPriceSlice, type PriceSlice } from "./priceSlice";

export type BitcoinStoreType = PriceSlice & MacroSlice & ChartSlice & ExRateSlice;

// 스토어가 하이드레이트되기 전에 구버전 값을 이관한다. (제거 예정)
migrateLegacyStore();

const useBitcoinStore = create<BitcoinStoreType>()(
  persist(
    (...a) => ({
      ...createPriceSlice(...a),
      ...createMacroSlice(...a),
      ...createChartSlice(...a),
      ...createExRateSlice(...a),
    }),
    { name: BITCOIN_PERSIST_KEY },
  ),
);

export default useBitcoinStore;
