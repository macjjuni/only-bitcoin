import { TARGET_BLOCK_INTERVAL_SECONDS } from "@/entities/block";
import type { HashrateUnit } from "../lib/hashrateUnit";

/** 그레고리력 평균 한 해(365.2425일). 로또 비교 문구도 이 기준을 쓴다. */
export const ONE_YEAR_IN_SECONDS = 31_556_952;

export interface OddsPeriod {
  label: string;
  durationInSeconds: number;
}

/**
 * 확률을 보여줄 기간 목록.
 * 첫 항목인 "다음 블록"은 λ 가 10⁻¹⁷ 수준까지 내려가 `1 - Math.exp(-λ)` 로는 계산이 무너지는 구간이다.
 */
export const ODDS_PERIODS: OddsPeriod[] = [
  { label: "다음 블록 (10분)", durationInSeconds: TARGET_BLOCK_INTERVAL_SECONDS },
  { label: "1일", durationInSeconds: 86_400 },
  { label: "1주", durationInSeconds: 604_800 },
  { label: "1개월", durationInSeconds: 2_629_746 },
  { label: "1년", durationInSeconds: ONE_YEAR_IN_SECONDS },
  { label: "10년", durationInSeconds: ONE_YEAR_IN_SECONDS * 10 },
];

export interface MinerPreset {
  name: string;
  hashrate: string;
  unit: HashrateUnit;
}

/** 솔로 마이닝에 실제로 쓰이는 대표 장비. 사용자가 스펙을 몰라도 바로 계산해 볼 수 있게 한다. */
export const MINER_PRESETS: MinerPreset[] = [
  { name: "NerdMiner v2", hashrate: "78", unit: "KH" },
  { name: "Bitaxe Gamma", hashrate: "1.2", unit: "TH" },
  { name: "Antminer S9", hashrate: "13.5", unit: "TH" },
  { name: "Antminer S21", hashrate: "200", unit: "TH" },
];
