"use client";

import { useMemo, useState } from "react";
import { calculateNetworkHashrate, getCurrentDifficulty, useBlockStore } from "@/entities/block";
import {
  calculateBlockFindProbability,
  calculateExpectedSecondsToFindBlock,
  calculateMedianSecondsToFindBlock,
  calculateNetworkShareRatio,
} from "../lib/calculateBlockOdds";
import {
  convertHashrateToHashPerSecond,
  type HashrateUnit,
  isOverMaxHashrate,
} from "../lib/hashrateUnit";
import { type MinerPreset, ONE_YEAR_IN_SECONDS } from "../model/constants";
import BlockOddsPeriodCard from "./BlockOddsPeriodCard";
import BlockOddsSummaryCard from "./BlockOddsSummaryCard";
import HashrateInputCard from "./HashrateInputCard";
import NetworkDifficultyCard from "./NetworkDifficultyCard";

const DEFAULT_HASHRATE_INPUT = "1.2";
const DEFAULT_HASHRATE_UNIT: HashrateUnit = "TH";

interface SoloMiningPanelProps {
  /** SSR 로 조회한 난이도. 소켓이 붙기 전 첫 페인트와 크롤러가 보는 값이다. */
  initialDifficulty: number;
}

export default function SoloMiningPanel({ initialDifficulty }: SoloMiningPanelProps) {
  // region [Hooks]
  const blockData = useBlockStore((state) => state.blockData);
  const [hashrateInput, setHashrateInput] = useState(DEFAULT_HASHRATE_INPUT);
  const [hashrateUnit, setHashrateUnit] = useState<HashrateUnit>(DEFAULT_HASHRATE_UNIT);
  const [isManualDifficultyMode, setIsManualDifficultyMode] = useState(false);
  const [manualDifficultyInput, setManualDifficultyInput] = useState("");
  // endregion

  // region [Privates]
  /** 소켓이 값을 채우기 전(= 서버 렌더링 및 첫 페인트)에는 SSR 값으로 대체한다. */
  const liveDifficulty = useMemo(() => {
    return getCurrentDifficulty(blockData) || initialDifficulty;
  }, [blockData, initialDifficulty]);

  const networkDifficulty = useMemo(() => {
    if (!isManualDifficultyMode) {
      return liveDifficulty;
    }

    const parsedDifficulty = Number.parseFloat(manualDifficultyInput);
    if (!Number.isFinite(parsedDifficulty) || parsedDifficulty <= 0) {
      return 0;
    }

    return parsedDifficulty;
  }, [isManualDifficultyMode, liveDifficulty, manualDifficultyInput]);

  const hashrateInHashPerSecond = useMemo(() => {
    return convertHashrateToHashPerSecond(hashrateInput, hashrateUnit);
  }, [hashrateInput, hashrateUnit]);

  const isOverMax = useMemo(() => {
    return isOverMaxHashrate(hashrateInput, hashrateUnit);
  }, [hashrateInput, hashrateUnit]);

  const blockOddsSummary = useMemo(() => {
    return {
      expectedSeconds: calculateExpectedSecondsToFindBlock(
        hashrateInHashPerSecond,
        networkDifficulty,
      ),
      medianSeconds: calculateMedianSecondsToFindBlock(hashrateInHashPerSecond, networkDifficulty),
      networkShareRatio: calculateNetworkShareRatio(hashrateInHashPerSecond, networkDifficulty),
      networkHashrate: calculateNetworkHashrate(networkDifficulty),
      oneYearProbability: calculateBlockFindProbability(
        hashrateInHashPerSecond,
        networkDifficulty,
        ONE_YEAR_IN_SECONDS,
      ),
    };
  }, [hashrateInHashPerSecond, networkDifficulty]);
  // endregion

  // region [Events]
  const onChangeHashrate = (nextHashrateInput: string) => {
    setHashrateInput(nextHashrateInput);
  };

  const onChangeHashrateUnit = (nextUnit: HashrateUnit) => {
    setHashrateUnit(nextUnit);
  };

  const onSelectMinerPreset = (preset: MinerPreset) => {
    setHashrateInput(preset.hashrate);
    setHashrateUnit(preset.unit);
  };

  const onChangeManualDifficulty = (nextDifficultyInput: string) => {
    setManualDifficultyInput(nextDifficultyInput);
  };

  const onToggleManualDifficultyMode = () => {
    const nextManualMode = !isManualDifficultyMode;

    // 직접 입력으로 전환할 때 실시간 난이도를 초기값으로 채워 빈 화면을 만들지 않는다.
    if (nextManualMode && manualDifficultyInput === "" && liveDifficulty > 0) {
      setManualDifficultyInput(String(liveDifficulty));
    }

    setIsManualDifficultyMode(nextManualMode);
  };
  // endregion

  return (
    <>
      <NetworkDifficultyCard
        liveDifficulty={liveDifficulty}
        manualDifficultyInput={manualDifficultyInput}
        isManualMode={isManualDifficultyMode}
        onChangeManualDifficulty={onChangeManualDifficulty}
        onToggleManualMode={onToggleManualDifficultyMode}
      />

      <HashrateInputCard
        hashrateInput={hashrateInput}
        unit={hashrateUnit}
        isOverMax={isOverMax}
        onChangeHashrate={onChangeHashrate}
        onChangeUnit={onChangeHashrateUnit}
        onSelectPreset={onSelectMinerPreset}
      />

      <BlockOddsSummaryCard
        expectedSeconds={blockOddsSummary.expectedSeconds}
        medianSeconds={blockOddsSummary.medianSeconds}
        networkShareRatio={blockOddsSummary.networkShareRatio}
        networkHashrate={blockOddsSummary.networkHashrate}
        oneYearProbability={blockOddsSummary.oneYearProbability}
      />

      <BlockOddsPeriodCard
        hashrateInHashPerSecond={hashrateInHashPerSecond}
        networkDifficulty={networkDifficulty}
      />
    </>
  );
}
