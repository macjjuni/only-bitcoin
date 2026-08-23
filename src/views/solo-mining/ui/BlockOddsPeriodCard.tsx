"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/shared/ui";
import { calculateBlockFindProbability } from "../lib/calculateBlockOdds";
import { formatOddsRatio, formatProbabilityPercent } from "../lib/formatOdds";
import { ODDS_PERIODS } from "../model/constants";

interface BlockOddsPeriodCardProps {
  hashrateInHashPerSecond: number;
  networkDifficulty: number;
}

export default function BlockOddsPeriodCard(props: BlockOddsPeriodCardProps) {
  const { hashrateInHashPerSecond, networkDifficulty } = props;

  // region [Templates]
  const periodOddsRows = useMemo(() => {
    return ODDS_PERIODS.map(({ label, durationInSeconds }) => {
      const probability = calculateBlockFindProbability(
        hashrateInHashPerSecond,
        networkDifficulty,
        durationInSeconds,
      );

      return {
        label,
        percentText: formatProbabilityPercent(probability),
        oddsText: formatOddsRatio(probability),
      };
    });
  }, [hashrateInHashPerSecond, networkDifficulty]);
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="text-md font-bold">기간별 블록 발견 확률</h2>

        <ul className="flex flex-col gap-2.5">
          {periodOddsRows.map(({ label, percentText, oddsText }) => (
            <li key={label} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
                <span className="font-number text-sm font-bold text-right break-all">
                  {percentText}
                </span>
              </div>
              <span className="font-number text-xs text-muted-foreground text-right">
                {oddsText}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-muted-foreground">
          포아송 분포로 계산한 &ldquo;해당 기간에 최소 1블록을 발견할&rdquo; 확률입니다. 난이도가
          바뀌면 값도 함께 바뀝니다.
        </p>
      </CardContent>
    </Card>
  );
}
