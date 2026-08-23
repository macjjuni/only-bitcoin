"use client";

import { memo, useMemo } from "react";
import type { InitialMacro, InitialPrice } from "@/entities/bitcoin";
import { useBitcoinStore } from "@/entities/bitcoin";
import { formatDate } from "@/shared/lib/date";
import useSettingStore from "@/shared/stores/settingStore";
import { CountText } from "@/shared/ui";
import { calcPremiumPercent } from "@/shared/utils/calculate";

interface PremiumPanelTypes {
  initialPrice: InitialPrice;
  initialMacro: InitialMacro;
}

const SCALE_GRADIENT = [
  "linear-gradient(90deg,",
  "rgb(var(--down-rgb) / .55),",
  "transparent 38%,",
  "hsl(var(--foreground) / .12) 49%,",
  "hsl(var(--foreground) / .12) 51%,",
  "transparent 62%,",
  "rgb(var(--up-rgb) / .55))",
].join(" ");

/** 스케일 바 최대 범위 (±SCALE_RANGE %) */
const SCALE_RANGE = 10;

const GRID_COLS = "1.15fr 1fr .78fr";

const PremiumPanel = ({ initialPrice, initialMacro }: PremiumPanelTypes) => {
  // region [Hooks]
  const { krw: socketKrw, usd: socketUsd } = useBitcoinStore((state) => state.bitcoinPrice);
  const { value: storeExRate, date: storeExRateDate } = useBitcoinStore((state) => state.exRate);
  const krwMarket = useBitcoinStore((state) => state.krwMarket);
  const usdMarket = useBitcoinStore((state) => state.usdMarket);
  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);

  const krw = socketKrw || initialPrice.krw;
  const usd = socketUsd || initialPrice.usd;
  const usdExRate = storeExRate || initialMacro.usdExRate;
  const date = storeExRateDate || initialMacro.usdExRateDate;
  // endregion

  // region [Privates]
  const premiumPercent = useMemo(
    () => calcPremiumPercent(krw, usd, usdExRate),
    [krw, usd, usdExRate],
  );

  const { usdKoreaPrice, krwGlobalPrice, premiumKrw, premiumUsd } = useMemo(() => {
    const koreaUsd = usdExRate ? krw / usdExRate : 0;
    const globalKrw = usd * usdExRate;
    return {
      usdKoreaPrice: koreaUsd,
      krwGlobalPrice: globalKrw,
      premiumKrw: krw - globalKrw,
      premiumUsd: koreaUsd - usd,
    };
  }, [krw, usd, usdExRate]);

  const isPositive = premiumPercent > 0;
  const isNegative = premiumPercent < 0;
  const signColor = isPositive ? "text-up" : isNegative ? "text-down" : "text-muted-foreground";
  const signBg = isPositive ? "bg-up" : isNegative ? "bg-down" : "bg-muted-foreground";
  const markerPos =
    Math.min(Math.max((premiumPercent + SCALE_RANGE) / (SCALE_RANGE * 2), 0), 1) * 100;
  // endregion

  return (
    <>
      {/* ── 1. 프리미엄 히어로 블록 ─────────────────────── */}
      <div className="border-b border-border pt-[26px] px-5 pb-[22px]">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col gap-1">
            <span
              className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-xs font-semibold font-pretendard tracking-wide border ${
                isPositive
                  ? "bg-up/10 text-up border-up/25"
                  : isNegative
                    ? "bg-down/10 text-down border-down/25"
                    : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPositive ? "bg-up" : isNegative ? "bg-down" : "bg-muted-foreground"
                }`}
              />
              {isPositive ? "프리미엄" : isNegative ? "역프리미엄" : "동일"}
            </span>
          </div>

          <div
            className={`font-number text-[66px] font-bold leading-[.9] tracking-[-.05em] tabular-nums ${signColor}`}
          >
            {isPositive && "+"}
            <CountText value={premiumPercent} decimals={2} />%
          </div>
        </div>

        {/* Scale Bar (-SCALE_RANGE% ~ +SCALE_RANGE%) */}
        <div className="relative mt-4">
          <div className="h-2 w-full" style={{ background: SCALE_GRADIENT }} />

          {/* 0% center tick */}
          <div
            className="absolute top-0 left-1/2 w-px h-2 -translate-x-1/2"
            style={{ background: "hsl(var(--foreground) / .3)" }}
          />

          {/* current value marker */}
          <div
            className={`absolute top-0 h-2 w-[3px] -translate-x-1/2 ${signBg}`}
            style={{ left: `${markerPos}%` }}
          />

          {/* scale labels */}
          <div className="flex justify-between font-pretendard text-xs text-muted-foreground mt-1.5">
            <span>-{SCALE_RANGE}%</span>
            <span>0</span>
            <span>+{SCALE_RANGE}%</span>
          </div>
        </div>
      </div>

      {/* ── 2. 원장 테이블 ──────────────────────────────── */}
      <div className="glass-bg">
        {/* Header */}
        <div
          className="grid border-b border-border py-2.5 px-5 font-pretendard text-xs tracking-[.12em] text-muted-foreground uppercase"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <span>구분</span>
          <span className="text-right">KRW</span>
          <span className="text-right">USD</span>
        </div>

        {/* 한국 가격 */}
        <div
          className="grid items-center border-b border-border py-[17px] px-5"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="flex flex-col">
            <span className="font-pretendard text-base leading-5">한국 가격</span>
            <span className="font-number text-xs tracking-[.05em] text-muted-foreground">
              {krwMarket}
            </span>
          </div>
          <CountText
            className="text-right text-lg font-bold tracking-[-.035em] tabular-nums"
            value={krw}
          />
          <CountText
            className="text-right text-lg font-bold tracking-[-.035em] tabular-nums"
            value={Math.round(usdKoreaPrice)}
          />
        </div>

        {/* 해외 가격 */}
        <div
          className="grid items-center border-b border-border py-[17px] px-5"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="flex flex-col">
            <span className="font-pretendard text-base leading-5">해외 가격</span>
            <span className="font-number text-xs tracking-[.05em] text-muted-foreground">
              {usdMarket}
            </span>
          </div>
          <CountText
            className="text-right text-lg font-bold tracking-[-.035em] tabular-nums"
            value={Math.round(krwGlobalPrice)}
          />
          <CountText
            className="text-right text-lg font-bold tracking-[-.035em] tabular-nums"
            value={Math.round(usd)}
          />
        </div>

        {/* 프리미엄 차이 (SPREAD) */}
        <div
          className="grid items-center border-b border-border py-[17px] px-5 bg-black/[.035] dark:bg-white/[.035]"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="flex flex-col">
            <span className="font-pretendard text-base leading-5">프리미엄 차이</span>
            <span className="font-number text-xs tracking-[.05em] text-muted-foreground">
              SPREAD
            </span>
          </div>
          <div
            className={`text-right font-number text-lg font-bold tracking-[-.035em] tabular-nums ${signColor}`}
          >
            {premiumKrw > 0 && "+"}
            <CountText value={Math.round(premiumKrw)} />
          </div>
          <div
            className={`text-right font-number text-lg font-bold tracking-[-.035em] tabular-nums ${signColor}`}
          >
            {premiumUsd > 0 && "+"}
            <CountText value={Math.round(premiumUsd)} />
          </div>
        </div>
      </div>

      {/* ── 3. 환율 행 ──────────────────────────────────── */}
      <div className="glass-bg flex items-end justify-between py-[18px] px-5">
        <div className="flex flex-col gap-0.5">
          <span className="font-pretendard text-base leading-5">{`실시간 환율(${isUsdtStandard ? "USDT" : "USD"}/KRW)`}</span>
          <span className="font-number text-xs text-muted-foreground">
            {formatDate(date, "YYYY.MM.DD")} 업데이트
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <CountText className="text-[24px] font-bold" value={usdExRate} decimals={1} />
          <span className="font-pretendard text-xs text-muted-foreground">KRW</span>
        </div>
      </div>
    </>
  );
};

const MemoizedPremiumPanel = memo(PremiumPanel);
MemoizedPremiumPanel.displayName = "PremiumPanel";

export default MemoizedPremiumPanel;
