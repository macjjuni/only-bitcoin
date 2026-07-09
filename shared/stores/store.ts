import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type BlockSlice, createBlockSlice } from "@/shared/stores/slices/blockSlice";
import { type Btc2FiatSlice, createBtc2FiatSlice } from "@/shared/stores/slices/btc2FiatSlice";
import { type ChartSlice, createChartSlice } from "@/shared/stores/slices/chartSlice";
import { createExRateSlice, type ExRateSlice } from "@/shared/stores/slices/exRateSlice";
import { createMacroSlice, type MacroSlice } from "@/shared/stores/slices/macroSlice";
import { createPriceSlice, type PriceSlice } from "@/shared/stores/slices/priceSlice";
import { createSettingSlice, type SettingSlice } from "@/shared/stores/slices/settingSlice";
import { createThemeSlice, type ThemeSlice } from "@/shared/stores/slices/themeSlice";

export const persistKey = "only-bitcoin";

export type StoreType = ThemeSlice &
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
    {
      name: persistKey,
      partialize: (state) => {
        // deferredPrompt는 브라우저 네이티브 이벤트 객체이므로 로컬 스토리지에 직렬화하여 저장하지 않습니다.
        const { setting, ...rest } = state;
        const { deferredPrompt, ...settingWithoutPrompt } = setting;
        return {
          ...rest,
          setting: settingWithoutPrompt,
        } as StoreType;
      },
    },
  ),
);

export default useStore;
