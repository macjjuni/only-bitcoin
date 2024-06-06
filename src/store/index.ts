import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type BtcProps,
  ThemeTypes,
  DominanceProps,
  MarketType,
  ExRateProps,
  UpdateKRWProps,
  UpdateUSDProps,
  UpdateDominanceProps,
  DropDownProps,
  FearGreedProps,
  BlockProps,
  MvrvStoreProps,
} from "@/store/type";

/** 📌 Rules!
 * 1. 설정(ex: 테마)값 업데이트 함수는 변경된 값을 그대로 리턴하도록 작성
 */

interface BearState {
  btc: BtcProps; // BTC 시세 정보
  dominance: DominanceProps; // 도미넌스 정보
  market: MarketType; // 메인 시세 단위 => 'KRW' | 'USD' | 'KRW/USD'
  exRate: ExRateProps; // USD/KRW 환율 데이터
  dropDown: DropDownProps; // btc2krw Toggle
  amount: string; // BTC 개수 Input 값
  isKimchi: boolean; // 김치 프리미엄 표시 여부
  isEcoSystem: boolean; // 비트코인 생태계 표시 여부
  isCountAnime: boolean; // 가격 변동 애니메이션 효과 여부
  isCountColor: boolean; // 가격 업다운 색 변경 여부
  fearGreed: FearGreedProps; // 공포&탐욕 지수
  theme: ThemeTypes;
  isLottiePlay: boolean; // 메인 로티 애니메이션
  blockData: BlockProps; // 블록 생성 정보
  mvrvData: MvrvStoreProps; // MVRV 데이터 조회 기록
  updateKRW: (by: UpdateKRWProps) => void;
  updateUSD: (by: UpdateUSDProps) => void;
  updateDoimnance: (by: UpdateDominanceProps) => void;
  setMarket: (market: MarketType) => MarketType;
  setExRate: (exRate: ExRateProps) => void;
  setDropDown: (bool: { [index: string]: boolean }) => void;
  setAmount: (by: string) => void;
  setKimchi: (bool: boolean) => boolean;
  setEco: (bool: boolean) => boolean;
  updateFearGreed: (data: FearGreedProps) => void;
  setTheme: (theme: ThemeTypes) => ThemeTypes;
  setCountAnime: (bool: boolean) => boolean;
  setCountColor: (bool: boolean) => boolean;
  toggleLottie: () => void;
  updateBlock: (blockData: BlockProps) => void; // 블록 생성 정보 업데이트
  setMvrv: (mvrv: MvrvStoreProps) => void; // MVRV 데이터 조회 기록
}

export const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      btc: { krw: 0, krwDate: "", krwColor: true, usd: 0, usdDate: "", usdColor: true },
      theme: "dark",
      market: "KRW/USD",
      setMarket: (market: MarketType) => {
        set({ market });
        return market;
      },
      dominance: { value: "", date: "" },
      fearGreed: { value: "", date: "" },
      exRate: { date: "", provider: "", basePrice: 0 },
      dropDown: { btcKrw: true },
      amount: "1",
      isKimchi: true,
      isEcoSystem: false,
      isSetting: false,
      isCountAnime: true,
      isCountColor: true,
      isLottiePlay: true,
      blockData: {
        height: 0,
        timeStamp: 0,
        updateTimeStamp: 0,
        halvingPercent: 0,
        nextHalving: {
          nextHalvingHeight: 0,
          nextHalvingPredictedDate: 0,
          remainingHeight: 0,
        },
      },
      mvrvData: { value: "", date: "", timeStamp: 0 },
      setAmount: (price) => set(() => ({ amount: price })),
      updateKRW: (krw) => set((state) => ({ btc: { ...state.btc, ...krw } })),
      updateUSD: (usd) => set((state) => ({ btc: { ...state.btc, ...usd } })),
      updateDoimnance: (dominance) => set(() => ({ dominance })),
      setDropDown: (bool) => set(() => ({ dropDown: { ...bool } })),
      setKimchi: (isKimchi) => {
        set({ isKimchi });
        return isKimchi;
      },
      setEco: (isEcoSystem) => {
        set({ isEcoSystem });
        return isEcoSystem;
      },
      setExRate: (exRate) => set(() => ({ exRate })),
      updateFearGreed: (data) => set(() => ({ fearGreed: data })),
      setTheme: (theme) => {
        set({ theme });
        return theme;
      },
      setCountAnime: (isCountAnime) => {
        set({ isCountAnime });
        return isCountAnime;
      },
      setCountColor: (isCountColor) => {
        set({ isCountColor });
        return isCountColor;
      },
      toggleLottie: () => set((state) => ({ isLottiePlay: !state.isLottiePlay })),
      updateBlock: (blockData) => set(() => ({ blockData })),
      setMvrv: (mvrvData: MvrvStoreProps) => set(() => ({ mvrvData })),
    }),
    { name: "bear-storage" } // persist key
  )
);

export const bearStore = useBearStore.getState();
