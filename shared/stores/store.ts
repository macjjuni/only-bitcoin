import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateLegacyStore, STORE_PERSIST_KEY } from "@/shared/stores/legacyMigration";
import { createSettingSlice, type SettingSlice } from "@/shared/stores/slices/settingSlice";
import { createThemeSlice, type ThemeSlice } from "@/shared/stores/slices/themeSlice";

/**
 * 레이어 중립 전역 상태(테마 / 앱 설정)만 보유한다.
 * 도메인 상태는 각 소유 레이어의 스토어에 있다.
 * - 비트코인 시세 / 차트 / 환율: `@/entities/bitcoin` 의 `useBitcoinStore`
 * - 블록 / 수수료: `@/entities/block` 의 `useBlockStore`
 * - BTC 변환 계산기: `@/views/btc2fiat` 의 `useBtc2FiatStore`
 */

export const persistKey = STORE_PERSIST_KEY;

export type StoreType = ThemeSlice & SettingSlice;

// 스토어가 하이드레이트되기 전에 구버전 값을 이관한다. (제거 예정)
migrateLegacyStore();

const useStore = create<StoreType>()(
  persist(
    (...a) => ({
      ...createThemeSlice(...a),
      ...createSettingSlice(...a),
    }),
    {
      name: persistKey,
      // v1: btc2Fiat 분리, v2: bitcoin / block 도메인 상태 분리
      version: 2,
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
