import type { PublicTreasurySummary } from "@/entities/treasury";
import { BITCOIN_COLOR } from "@/shared/config/color";
import {
  formatBtcCount,
  formatKstDateTime,
  formatPercent,
  formatSignedPercent,
  formatSignedUsdCompact,
  formatUsdCompact,
} from "../lib/formatTreasury";
import {
  calculateFilledSegmentCount,
  calculateSegmentFillRatio,
  calculateSupplySharePercent,
  SUPPLY_GAUGE_SEGMENT_COUNT,
} from "../lib/supplyGauge";

interface TreasurySummaryCardProps {
  summary: PublicTreasurySummary;
  /** 스냅샷을 만든 시각(ISO 8601). */
  fetchedAt: string;
}

/** 게이지 칸 인덱스. 렌더마다 다시 만들 이유가 없어 모듈 상수로 뺐음. */
const SUPPLY_GAUGE_SEGMENT_INDEXES = Array.from(
  { length: SUPPLY_GAUGE_SEGMENT_COUNT },
  (_unused, segmentIndex) => segmentIndex,
);

/** 게이지 · 지표 박스의 공통 틀. 틴트 위에 얹히므로 배경은 반투명으로 씀. */
const PANEL_CLASS_NAME = "rounded-xl border border-border bg-background/55 glass-bg";

/**
 * 상장기업 전체 합산 지표. 페이지 최상단을 통째로 쓰는 히어로임.
 *
 * 카드( 테두리 · 라운드 )를 두르지 않고 좌우 · 위 여백을 음수 마진으로 걷어내
 * 헤더 바로 아래에 붙였음. 배경은 헤더와 같은 그라데이션을 이어받음.
 * ( `buildHeroGradientStyle` 주석 참고 )
 *
 * 서버 컴포넌트로 둬서 크롤러가 보는 HTML 에 수치가 그대로 담기게 함.
 */
export default function TreasurySummaryCard({ summary, fetchedAt }: TreasurySummaryCardProps) {
  // region [Privates]
  const isProfitable = summary.unrealizedProfitInUsd >= 0;
  const profitColorClassName = isProfitable ? "text-up" : "text-down";

  const supplySharePercent = calculateSupplySharePercent(summary.totalHoldingsInBtc);
  const filledSegmentCount = calculateFilledSegmentCount(supplySharePercent);
  // endregion

  return (
    <section className="-mx-2 -mt-2.5 select-none">
      <div className="flex flex-col px-5 pb-5 pt-4">
        <span className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-bitcoin">
          Public Company Treasury
        </span>
        <h2 className="mb-2.5 text-[19px] font-bold leading-tight tracking-tight">
          상장기업 비트코인 트레저리
        </h2>

        {/* 히어로 숫자. 폭이 좁아지면 글자도 같이 줄어야 9자리 수가 안 넘침. */}
        <strong className="font-number mb-1.5 block text-[clamp(2rem,10vw,3.25rem)] font-black leading-none tracking-tight">
          {formatBtcCount(summary.totalHoldingsInBtc)}
          <span className="ml-2 text-[24px] font-black text-bitcoin">BTC</span>
        </strong>

        <div className="mb-5 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <span className="font-number">≈ {formatUsdCompact(summary.totalValueInUsd)}</span>
          <span className="h-3 w-px bg-border" />
          <span>
            전 세계{" "}
            <span className="font-number">{summary.companyCount.toLocaleString("ko-KR")}</span>곳
          </span>
        </div>

        {/*
          보유량(BTC)만 크게 적으면 "많다" 로만 읽히고 끝남. 21칸 게이지로 총 발행량 중
          어디까지 차 있는지를 같이 보여야 숫자에 스케일이 붙음. 한 칸이 100만 BTC 임.
        */}
        <div className={`${PANEL_CLASS_NAME} mb-2.5 p-4`}>
          <div className="mb-3 flex items-end justify-between gap-2">
            <span className="text-[13px] font-bold leading-tight text-muted-foreground">
              총 발행량 <span className="font-number">2,100</span>만 BTC 중
            </span>
            <span className="font-number text-[26px] font-black leading-none tracking-tight text-bitcoin">
              {formatPercent(supplySharePercent)}
            </span>
          </div>

          <div className="flex gap-[3px]">
            {SUPPLY_GAUGE_SEGMENT_INDEXES.map((segmentIndex) => (
              <div
                key={segmentIndex}
                // 라이트 모드에선 옅은 배경만으로 빈 칸이 안 보임. 테두리로 칸이 세어지게 했음.
                className="h-[18px] flex-1 overflow-hidden rounded-[3px] border border-border bg-foreground/5"
              >
                <div
                  className="h-full rounded-[3px]"
                  style={{
                    width: `${calculateSegmentFillRatio(segmentIndex, filledSegmentCount) * 100}%`,
                    background: `linear-gradient(180deg, #FFB347 0%, ${BITCOIN_COLOR} 100%)`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>
              한 칸 = <span className="font-number">100</span>만 BTC
            </span>
            <span className="font-number">21,000,000 BTC</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2.5">
          <div className={`${PANEL_CLASS_NAME} px-3 py-2.5`}>
            <dt className="mb-0.5 text-[11px] font-medium text-muted-foreground">매입 총액</dt>
            <dd className="font-number whitespace-nowrap text-[17px] font-black">
              {formatUsdCompact(summary.totalEntryValueInUsd)}
            </dd>
          </div>

          <div className={`${PANEL_CLASS_NAME} px-3 py-2.5`}>
            <dt className="mb-0.5 text-[11px] font-medium text-muted-foreground">평가손익</dt>
            {/* `조 달러` 가 붙으면 금액과 수익률이 한 줄에 안 들어가 "달 러" 로 잘림. */}
            <dd className={`flex flex-col ${profitColorClassName}`}>
              <span className="font-number whitespace-nowrap text-[17px] font-black leading-tight">
                {formatSignedUsdCompact(summary.unrealizedProfitInUsd)}
              </span>
              <span className="font-number whitespace-nowrap text-xs font-bold">
                {formatSignedPercent(summary.unrealizedProfitRatePercent)}
              </span>
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          업데이트 <span className="font-number">{formatKstDateTime(fetchedAt)}</span>
        </p>
      </div>
    </section>
  );
}
