"use client";

import { KIcon } from "kku-ui";
import { ArrowRightLeft, Globe, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { memo, type RefObject, useMemo, useState } from "react";
import { QRCode } from "react-qrcode-logo";
import { useBitcoinStore } from "@/entities/bitcoin";
import { env } from "@/shared/config/env";
import { getCurrentDateTimeKST } from "@/shared/lib/date";
import useSettingStore from "@/shared/stores/settingStore";
import { BtcTextLogo, CountText } from "@/shared/ui";
import { calcPremiumPercent } from "@/shared/utils/calculate";

export const PREMIUM_SHARE_CARD_DESIGN_WIDTH = 440;
const SERVICE_DOMAIN = "ONLY-BTC.APP";

export interface PremiumShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
}

function buildCurrentShareUrl(): string {
  if (typeof window === "undefined") {
    return `${env.NEXT_PUBLIC_URL}/premium`;
  }
  return new URL("/premium", env.NEXT_PUBLIC_URL).toString();
}

function PremiumShareCard({ cardRef }: PremiumShareCardProps) {
  // region [Hooks]
  const currency = useSettingStore((state) => state.setting.currency);
  const { krw: socketKrw, usd: socketUsd } = useBitcoinStore((state) => state.bitcoinPrice);
  const { value: storeExRate, date: storeExRateDate } = useBitcoinStore((state) => state.exRate);
  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);

  const [capturedAtKst] = useState<string>(getCurrentDateTimeKST);
  const [shareUrl] = useState<string>(buildCurrentShareUrl);

  const krw = socketKrw || 142500000;
  const usd = socketUsd || 95200;
  const usdExRate = storeExRate || 1450;
  const date = storeExRateDate || capturedAtKst;

  const { usdKoreaPrice, krwGlobalPrice, diffKrw, diffUsd } = useMemo(() => {
    const usdKoreaPrice = usdExRate ? krw / usdExRate : 0;
    const krwGlobalPrice = usd * usdExRate;
    const diffKrw = krw - krwGlobalPrice;
    const diffUsd = usdKoreaPrice - usd;

    return { usdKoreaPrice, krwGlobalPrice, diffKrw, diffUsd };
  }, [krw, usd, usdExRate]);

  const PremiumPercent = useMemo(
    () => calcPremiumPercent(krw, usd, usdExRate),
    [krw, usd, usdExRate],
  );

  const isPositive = PremiumPercent > 0;
  const isNegative = PremiumPercent < 0;
  // endregion

  return (
    <div
      ref={cardRef}
      style={{ width: `${PREMIUM_SHARE_CARD_DESIGN_WIDTH}px` }}
      className="relative overflow-hidden rounded-3xl border border-bitcoin/40 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 font-pretendard text-white shadow-2xl select-none"
    >
      {/* 배경 앰비언트 글로우 */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-bitcoin/25 blur-3xl opacity-80" />

      {/* 1. Header: Live Dot & Index Title */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-bitcoin">
            KOREA PREMIUM INDEX
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${
            isPositive
              ? "bg-bitcoin/20 text-bitcoin border border-bitcoin/40 shadow-[0_0_12px_rgba(247,147,26,0.3)]"
              : isNegative
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                : "bg-white/10 text-muted-foreground border border-white/15"
          }`}
        >
          {isPositive ? (
            <>
              <Zap size={13} className="fill-bitcoin text-bitcoin animate-pulse" />
              한국 프리미엄
            </>
          ) : isNegative ? (
            <>
              <TrendingDown size={13} />
              역프리미엄
            </>
          ) : (
            "동일 시세"
          )}
        </span>
      </div>

      {/* 2. Hero Centerpiece: 압도적 폰트의 프리미엄율(%) */}
      <div className="relative z-10 py-6 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium text-white/60 mb-1">실시간 시세 차율</span>
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={`text-4xl font-black ${
              isPositive ? "text-bitcoin" : isNegative ? "text-sky-400" : "text-white"
            }`}
          >
            {isPositive ? "+" : ""}
          </span>
          <CountText
            className={`text-6xl font-black tracking-tight drop-shadow-[0_0_25px_rgba(247,147,26,0.35)] ${
              isPositive
                ? "text-bitcoin"
                : isNegative
                  ? "text-sky-400 drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]"
                  : "text-white"
            }`}
            value={PremiumPercent}
            decimals={2}
          />
          <span
            className={`text-4xl font-black ml-0.5 ${
              isPositive ? "text-bitcoin" : isNegative ? "text-sky-400" : "text-white"
            }`}
          >
            %
          </span>
        </div>

        {/* 시세 차액 (Gap) 캡슐 배너 */}
        <div className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold border border-white/15 shadow-inner">
          <span className="text-white/70">시세 갭(Gap)</span>
          <span className="h-3 w-px bg-white/20" />
          <div className="flex items-center gap-1.5 text-white font-extrabold">
            {currency.includes("KRW") && (
              <span>
                {diffKrw >= 0 ? "+" : ""}
                <CountText value={diffKrw} /> KRW
              </span>
            )}
            {currency.includes("USD") && (
              <span className="text-white/70 font-normal">
                ({diffUsd >= 0 ? "+" : ""}
                <CountText value={diffUsd} decimals={2} /> USD)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. 2-Column Comparative Exchange Grid (국내 Upbit vs 해외 Binance) */}
      <div className="relative z-10 grid grid-cols-2 gap-3 pt-2">
        {/* 국내 시세 (Upbit) */}
        <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <span className="flex h-2 w-2 rounded-full bg-bitcoin" />
              업비트 (Upbit)
            </div>
            <span className="rounded bg-bitcoin/20 px-1.5 py-0.5 text-[10px] font-extrabold text-bitcoin">
              KRW
            </span>
          </div>
          <div className="pt-3 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1">
              <CountText className="text-xl font-black text-white" value={krw} />
              <span className="text-xs font-bold text-white/60">KRW</span>
            </div>
            <div className="flex items-baseline gap-1 text-xs text-white/60 font-mono">
              <span>≈</span>
              <CountText value={usdKoreaPrice} decimals={2} />
              <span>USD</span>
            </div>
          </div>
        </div>

        {/* 해외 시세 (Binance) */}
        <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Globe size={13} className="text-sky-400" />
              바이낸스 (Binance)
            </div>
            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-sky-400">
              USD
            </span>
          </div>
          <div className="pt-3 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1">
              <CountText className="text-xl font-black text-white" value={usd} decimals={2} />
              <span className="text-xs font-bold text-white/60">USD</span>
            </div>
            <div className="flex items-baseline gap-1 text-xs text-white/60 font-mono">
              <span>≈</span>
              <CountText value={krwGlobalPrice} />
              <span>KRW</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Exchange Rate Info Row */}
      <div className="relative z-10 border-t border-white/10 mt-5 pt-3.5 flex items-center justify-between text-xs text-white/70">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft size={13} className="text-bitcoin" />
          <span>{!isUsdtStandard ? "환율" : "USDT"}</span>
          <span className="font-bold text-white">
            1 {!isUsdtStandard ? "USD" : "USDT"} = <CountText value={usdExRate} decimals={1} /> KRW
          </span>
        </div>
        <span className="text-[11px] font-mono text-white/50">{capturedAtKst}</span>
      </div>

      {/* 5. Footer: QR Code & Brand Watermark */}
      <div className="relative z-10 border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {shareUrl ? (
            <div className="overflow-hidden rounded-lg bg-white p-1 shadow-md">
              <QRCode
                value={shareUrl}
                size={44}
                quietZone={0}
                logoImage="/images/btc-3d-card.png"
                logoWidth={14}
                logoHeight={14}
                qrStyle="dots"
                eyeRadius={4}
              />
            </div>
          ) : null}
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-widest text-bitcoin">
              {SERVICE_DOMAIN}
            </span>
            <span className="text-[10px] text-white/60">비트코인 실시간 한국 프리미엄</span>
          </div>
        </div>

        <BtcTextLogo height={16} width={68} />
      </div>
    </div>
  );
}

export default memo(PremiumShareCard);
