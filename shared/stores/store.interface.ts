/**
 * 스토어 타입 배럴(barrel).
 * 실제 타입 정의는 각 도메인 슬라이스(`slices/*Slice.ts`)에 위치하며,
 * 이 파일은 기존 `@/shared/stores/store.interface` import 경로 호환을 위해 재export한다.
 */

export type {
  BitcoinPriceKRWTypes,
  BitcoinPriceTypes,
  BitcoinPriceUSDTypes,
  ExRateTypes,
  MarketChartIntervalType,
  MiningMetricChartIntervalType,
  OverviewChartType,
} from "@/entities/bitcoin";
export type { BlockTypes, FeesTypes } from "@/entities/block";
export type {
  BeforeInstallPromptEvent,
  CurrencyTypes,
  SettingTypes,
} from "@/shared/stores/slices/settingSlice";
export type { StoreType } from "@/shared/stores/store";
