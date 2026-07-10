import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ChartSlice,
  createChartSlice,
  createExRateSlice,
  createMacroSlice,
  createPriceSlice,
  type ExRateSlice,
  type MacroSlice,
  type PriceSlice,
} from "@/entities/bitcoin";
import { type BlockSlice, createBlockSlice } from "@/entities/block";
import { migrateLegacyStore, STORE_PERSIST_KEY } from "@/shared/stores/legacyMigration";
import { createSettingSlice, type SettingSlice } from "@/shared/stores/slices/settingSlice";
import { createThemeSlice, type ThemeSlice } from "@/shared/stores/slices/themeSlice";

export const persistKey = STORE_PERSIST_KEY;

export type StoreType = ThemeSlice &
  PriceSlice &
  MacroSlice &
  ChartSlice &
  ExRateSlice &
  BlockSlice &
  SettingSlice;

// 스토어가 하이드레이트되기 전에 구버전 값을 이관한다. (제거 예정)
migrateLegacyStore();

const useStore = create<StoreType>()(
  persist(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createPriceSlice(...a),
      ...createMacroSlice(...a),
      ...createChartSlice(...a),
      ...createExRateSlice(...a),
      ...createBlockSlice(...a),
      ...createSettingSlice(...a),
    }),
    {
      name: persistKey,
      // v1: btc2Fiat 상태가 `only-bitcoin-btc2fiat` 전용 스토어로 분리됐다.
      version: 1,
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
