import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStore } from "@/shared/stores/legacyMigration";
import { BTC2FIAT_PERSIST_KEY } from "@/shared/stores/persistKeys";
import useSettingStore from "@/shared/stores/settingStore";

export type UnitType = "BTC" | "USD" | "KRW" | "SATS";

export interface Btc2FiatState {
  btc2Fiat: { btcCount: string; krw: string; usd: string; sats: string };
  setBtcCount: (btcCount: string) => void;
  setKrw: (krw: string) => void;
  setUsd: (usd: string) => void;
  setSats: (sats: string) => void;
  focusCurrency: UnitType;
  setFocusCurrency: (currency: UnitType) => void;
  premium: number;
  setPremium: (premium: number) => void;
}

// 전용 스토어가 하이드레이트되기 전에 구버전 값을 이관한다. (제거 예정)
migrateLegacyStore();

const useBtc2FiatStore = create<Btc2FiatState>()(
  persist(
    (set) => ({
      btc2Fiat: { btcCount: "1", krw: "0", usd: "0", sats: "0" },
      setBtcCount: (btcCount) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, btcCount } })),
      setKrw: (krw) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, krw } })),
      setUsd: (usd) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, usd } })),
      setSats: (sats) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, sats } })),
      focusCurrency: "BTC",
      setFocusCurrency: (focusCurrency) => set(() => ({ focusCurrency })),
      premium: 0,
      setPremium: (premium) => set(() => ({ premium })),
    }),
    { name: BTC2FIAT_PERSIST_KEY },
  ),
);

/**
 * 통화 설정(`setting.currency`)이 변경되면 기준 단위(`focusCurrency`)를 보정한다.
 *
 * 스토어 분리 전에는 shared 레이어의 `settingSlice.setCurrency`가 btc2Fiat 슬라이스의
 * `focusCurrency`를 직접 write 했다. 이는 하위 레이어가 상위 레이어 상태를 침범하는
 * 구조였으므로, 소유 레이어인 이곳에서 구독하도록 방향을 뒤집었다.
 *
 * 설정 페이지와 btc2fiat 페이지는 서로 다른 라우트라 `ConvertPanel`이 마운트된 동안에는
 * 통화 변경이 일어나지 않는다. 따라서 컴포넌트 `useEffect`가 아니라 모듈 스코프 구독을 쓴다.
 * 마운트/초기화 시점에는 보정하지 않는다. 그래야 `focusCurrency`가 `"SATS"`인 사용자가
 * 새로고침할 때마다 `"BTC"`로 되돌아가지 않는다.
 */
useSettingStore.subscribe((state, previousState) => {
  const { currency } = state.setting;

  if (currency === previousState.setting.currency) {
    return;
  }

  const { focusCurrency, setFocusCurrency } = useBtc2FiatStore.getState();
  const isFocusCurrencyAvailable = currency.includes(focusCurrency);

  if (!isFocusCurrencyAvailable) {
    setFocusCurrency("BTC");
  }
});

export default useBtc2FiatStore;
