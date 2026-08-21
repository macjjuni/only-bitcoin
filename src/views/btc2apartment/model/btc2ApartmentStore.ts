import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_APARTMENT_ID } from "@/entities/apartment";

export interface Btc2ApartmentState {
  apartmentID: string;
  /**
   * 사용자가 직접 고른 평형. `null` 이면 단지의 기본 평형을 따른다.
   * 단지를 바꾸면 다시 `null` 로 돌아간다 — 단지마다 보유 평형이 다르기 때문이다.
   */
  selectedAreaInSquareMeter: number | null;
  setApartmentID: (apartmentID: string) => void;
  setSelectedArea: (areaInSquareMeter: number | null) => void;
}

/**
 * BTC to Apartment 페이지의 선택 상태.
 *
 * 재방문 시 마지막으로 보던 단지를 유지한다.
 */
const useBtc2ApartmentStore = create<Btc2ApartmentState>()(
  persist(
    (set) => ({
      apartmentID: DEFAULT_APARTMENT_ID,
      selectedAreaInSquareMeter: null,

      setApartmentID: (apartmentID) =>
        // 단지가 바뀌면 평형 선택은 초기화한다. 이전 단지에만 있던 평형이 남으면 빈 차트가 된다.
        set(() => ({ apartmentID, selectedAreaInSquareMeter: null })),
      setSelectedArea: (selectedAreaInSquareMeter) => set(() => ({ selectedAreaInSquareMeter })),
    }),
    {
      name: "btc2apartment",
      /**
       * 단위 토글이 사라지면서 `priceUnit`( v0 ) · `displayMode`( v1 ) 도 함께 없앰.
       * 남은 선택만 이어받아 재방문자의 단지가 초기화되지 않게 함.
       */
      version: 2,
      migrate: (persistedState) => {
        const { apartmentID, selectedAreaInSquareMeter } = (persistedState ??
          {}) as Partial<Btc2ApartmentState>;

        return {
          apartmentID: apartmentID ?? DEFAULT_APARTMENT_ID,
          selectedAreaInSquareMeter: selectedAreaInSquareMeter ?? null,
        } as Btc2ApartmentState;
      },
    },
  ),
);

export default useBtc2ApartmentStore;
