/**
 * 스토어 타입 배럴(barrel).
 * 실제 타입 정의는 각 도메인 슬라이스(`slices/*Slice.ts`)에 위치하며,
 * 이 파일은 기존 `@/shared/stores/store.interface` import 경로 호환을 위해 재export한다.
 */

export type { BlockTypes, FeesTypes } from "@/shared/stores/slices/blockSlice";
export type { UnitType } from "@/shared/stores/slices/btc2FiatSlice";
export type {
  MarketChartIntervalType,
  MiningMetricChartIntervalType,
  OverviewChartType,
} from "@/shared/stores/slices/chartSlice";
export type { ExRateTypes } from "@/shared/stores/slices/exRateSlice";
export type {
  BitcoinPriceKRWTypes,
  BitcoinPriceTypes,
  BitcoinPriceUSDTypes,
} from "@/shared/stores/slices/priceSlice";
export type {
  BeforeInstallPromptEvent,
  CurrencyTypes,
  SettingTypes,
} from "@/shared/stores/slices/settingSlice";
export type { StoreType } from "@/shared/stores/store";
