"use client";

import { Card, CardContent } from "@/shared/ui";
import { formatHashrate } from "@/shared/utils/number";
import { compareToLotteryJackpot } from "../lib/calculateBlockOdds";
import {
  formatDurationFromSeconds,
  formatLotteryComparison,
  formatProbabilityPercent,
} from "../lib/formatOdds";

interface BlockOddsSummaryCardProps {
  expectedSeconds: number;
  medianSeconds: number;
  networkShareRatio: number;
  networkHashrate: number;
  oneYearProbability: number;
}

export default function BlockOddsSummaryCard(props: BlockOddsSummaryCardProps) {
  const { expectedSeconds, medianSeconds, networkShareRatio, networkHashrate, oneYearProbability } =
    props;

  // region [Privates]
  const lotteryComparisonText = formatLotteryComparison(
    compareToLotteryJackpot(oneYearProbability),
  );
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">블록 1개를 캐기까지 평균</span>
          <strong className="font-number text-2xl font-bold text-bitcoin break-all">
            {formatDurationFromSeconds(expectedSeconds)}
          </strong>
        </div>

        <dl className="flex flex-col gap-2 border-t border-neutral-300 pt-3 text-sm dark:border-neutral-600">
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">중앙값 (절반이 이 안에 성공)</dt>
            <dd className="font-number font-bold text-right break-all">
              {formatDurationFromSeconds(medianSeconds)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">네트워크 점유율</dt>
            <dd className="font-number font-bold text-right break-all">
              {formatProbabilityPercent(networkShareRatio)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">네트워크 전체 해시레이트</dt>
            <dd className="font-number font-bold text-right break-all">
              {formatHashrate(networkHashrate)}
            </dd>
          </div>
        </dl>

        <p className="rounded-lg bg-bitcoin/10 px-3 py-2 text-xs leading-relaxed text-foreground">
          1년치 확률은 <b className="font-number">{lotteryComparisonText}</b>입니다.
        </p>

        <p className="text-xs leading-relaxed text-muted-foreground">
          평균은 중앙값보다 깁니다. 채굴은 기억이 없는(memoryless) 과정이라 어제 못 캤다고 오늘
          확률이 오르지 않아요.
        </p>
      </CardContent>
    </Card>
  );
}
