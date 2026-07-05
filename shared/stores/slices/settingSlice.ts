import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


export type CurrencyTypes = 'KRW' | 'USD' | 'KRW/USD';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface SettingTypes {
  initialPath: string;
  currency: CurrencyTypes;
  isUsdtStandard: boolean;
  isCountUp: boolean;
  isBackgroundImg: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}


export interface SettingSlice {
  setting: SettingTypes;
  setInitialPath: (path: string) => void;
  setCurrency: (currency: CurrencyTypes) => void;
  setUsdtStandard: (isUsdtStandard: boolean) => void;
  setIsCountUp: (isCountUp: boolean) => void;
  setIsBackgroundImg: (isBackgroundImg: boolean) => void;
  setDeferredPrompt: (deferredPrompt: BeforeInstallPromptEvent | null) => void;
}


export const createSettingSlice: StateCreator<StoreType, [], [], SettingSlice> = (set) => ({
  setting: {
    initialPath: "/overview",
    currency: "KRW/USD",
    isUsdtStandard: false,
    isCountUp: true,
    isBackgroundImg: true,
    deferredPrompt: null
  },
  setInitialPath: (path) => set((state) => ({
    setting: { ...state.setting, initialPath: path }
  })),
  setCurrency: (currency) => set((state) => {
    // BTC2Fiat 페이지 설정 충돌 방지
    const isNotIncludeCurrency = currency.includes(state.focusCurrency);
    const focusCurrency = !isNotIncludeCurrency ? "BTC" : state.focusCurrency;

    return { setting: { ...state.setting, currency }, focusCurrency };
  }),
  setUsdtStandard: (isUsdtStandard) => set((state) => ({
    setting: { ...state.setting, isUsdtStandard }
  })),
  setIsCountUp: (isCountUp) => set((state) => ({
    setting: { ...state.setting, isCountUp }
  })),
  setIsBackgroundImg: (isBackgroundImg) => set((state) => ({
    setting: { ...state.setting, isBackgroundImg }
  })),
  setDeferredPrompt: (deferredPrompt) => set((state) => ({
    setting: { ...state.setting, deferredPrompt }
  })),
});
