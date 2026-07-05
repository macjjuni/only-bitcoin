import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createThemeSlice, ThemeSlice } from "@/shared/stores/slices/themeSlice";
import { createPriceSlice, PriceSlice } from "@/shared/stores/slices/priceSlice";
import { createMacroSlice, MacroSlice } from "@/shared/stores/slices/macroSlice";
import { createChartSlice, ChartSlice } from "@/shared/stores/slices/chartSlice";
import { createExRateSlice, ExRateSlice } from "@/shared/stores/slices/exRateSlice";
import { createBlockSlice, BlockSlice } from "@/shared/stores/slices/blockSlice";
import { createBtc2FiatSlice, Btc2FiatSlice } from "@/shared/stores/slices/btc2FiatSlice";
import { createSettingSlice, SettingSlice } from "@/shared/stores/slices/settingSlice";

export const persistKey = "only-bitcoin";

export type StoreType =
  ThemeSlice &
  PriceSlice &
  MacroSlice &
  ChartSlice &
  ExRateSlice &
  BlockSlice &
  Btc2FiatSlice &
  SettingSlice;

const useStore = create<StoreType>()(
  persist(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createPriceSlice(...a),
      ...createMacroSlice(...a),
      ...createChartSlice(...a),
      ...createExRateSlice(...a),
      ...createBlockSlice(...a),
      ...createBtc2FiatSlice(...a),
      ...createSettingSlice(...a),
    }),
    { name: persistKey }
  )
);


export default useStore;
