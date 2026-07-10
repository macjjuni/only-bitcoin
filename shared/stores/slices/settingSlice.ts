import type { StateCreator } from "zustand";

export type CurrencyTypes = "KRW" | "USD" | "KRW/USD";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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

export const createSettingSlice: StateCreator<SettingSlice> = (set) => ({
  setting: {
    initialPath: "/overview",
    currency: "KRW/USD",
    isUsdtStandard: false,
    isCountUp: true,
    isBackgroundImg: true,
    deferredPrompt: null,
  },
  setInitialPath: (path) =>
    set((state) => ({
      setting: { ...state.setting, initialPath: path },
    })),
  // BTC2Fiat 페이지의 기준 단위(focusCurrency) 보정은 views/btc2fiat 에서 이 값을 구독해 처리한다.
  setCurrency: (currency) =>
    set((state) => ({
      setting: { ...state.setting, currency },
    })),
  setUsdtStandard: (isUsdtStandard) =>
    set((state) => ({
      setting: { ...state.setting, isUsdtStandard },
    })),
  setIsCountUp: (isCountUp) =>
    set((state) => ({
      setting: { ...state.setting, isCountUp },
    })),
  setIsBackgroundImg: (isBackgroundImg) =>
    set((state) => ({
      setting: { ...state.setting, isBackgroundImg },
    })),
  setDeferredPrompt: (deferredPrompt) =>
    set((state) => ({
      setting: { ...state.setting, deferredPrompt },
    })),
});
