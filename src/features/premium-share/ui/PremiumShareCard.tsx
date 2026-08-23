"use client";

import { KIcon } from "kku-ui";
import Image from "next/image";
import { memo, type RefObject, useEffect, useMemo, useState } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { krwMarketOptions, usdMarketOptions } from "@/entities/bitcoin/model/market";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { env } from "@/shared/config/env";
import { getCurrentDateTimeKST } from "@/shared/lib/date";
import useSettingStore from "@/shared/stores/settingStore";
import { BtcTextLogo, ShareCardQr } from "@/shared/ui";
import { calcPremiumPercent } from "@/shared/utils/calculate";

export const PREMIUM_SHARE_CARD_DESIGN_WIDTH = 440;
const SERVICE_DOMAIN = "ONLY-BTC.APP";
const BG_UP_IMAGE_SRC = "/images/premium/premium-up-bg.webp";
const BG_DOWN_IMAGE_SRC = "/images/premium/premium-down-bg.webp";
export const SHARE_QR_CANVAS_ID = "premium-share-qr";

const UP_COLOR = "#22c55e";
const DOWN_COLOR = "#ef4444";

function buildCurrentShareUrl(): string {
  if (typeof window === "undefined") {
    return `${env.NEXT_PUBLIC_URL}/premium`;
  }
  return new URL("/premium", env.NEXT_PUBLIC_URL).toString();
}

export interface PremiumShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
}

function PremiumShareCard({ cardRef }: PremiumShareCardProps) {
  // region [Hooks]
  const currency = useSettingStore((state) => state.setting.currency);
  const { krw: socketKrw, usd: socketUsd } = useBitcoinStore((state) => state.bitcoinPrice);
  const { value: storeExRate } = useBitcoinStore((state) => state.exRate);
  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);
  const krwMarket = useBitcoinStore((state) => state.krwMarket);
  const usdMarket = useBitcoinStore((state) => state.usdMarket);

  const [capturedAtKst] = useState<string>(getCurrentDateTimeKST);
  const [shareUrl, setShareUrl] = useState("");

  const krw = socketKrw || 142500000;
  const usd = socketUsd || 95200;
  const usdExRate = storeExRate || 1450;

  const { diffKrw, diffUsd } = useMemo(() => {
    const usdKoreaPrice = usdExRate ? krw / usdExRate : 0;
    const krwGlobalPrice = usd * usdExRate;

    return { diffKrw: krw - krwGlobalPrice, diffUsd: usdKoreaPrice - usd };
  }, [krw, usd, usdExRate]);

  const PremiumPercent = useMemo(
    () => calcPremiumPercent(krw, usd, usdExRate),
    [krw, usd, usdExRate],
  );

  const isPositive = PremiumPercent > 0;
  const isNegative = PremiumPercent < 0;

  const BG_SRC = useMemo(() => (isPositive ? BG_UP_IMAGE_SRC : BG_DOWN_IMAGE_SRC), [isPositive]);
  const themeColor = isPositive ? UP_COLOR : isNegative ? DOWN_COLOR : "#FFFFFF";

  const krwMarketLabel = krwMarketOptions.find((o) => o.value === krwMarket)?.label ?? krwMarket;
  const usdMarketLabel = usdMarketOptions.find((o) => o.value === usdMarket)?.label ?? usdMarket;
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setShareUrl(buildCurrentShareUrl());
  }, []);
  // endregion

  return (
    <div
      ref={cardRef}
      data-background-src={BG_SRC}
      className="font-pretendard relative w-[440px] overflow-hidden rounded-[32px] select-none"
    >
      {/* 배경 이미지. 캡처에서는 빼고 canvas 에 직접 합성함. */}
      <Image
        src={BG_SRC}
        alt="bitcoin premium"
        fill
        sizes="440px"
        priority
        className="object-cover"
        data-capture-ignore=""
        draggable={false}
      />

      {/* 글자가 사진 어디에 얹혀도 읽히게 그라데이션 오버레이를 깔았음 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/75 to-black/90" />

      <div className="relative flex flex-col p-6 text-white">
        {/* 헤더: 로고 + QR */}
        <div className="mb-3 flex items-start gap-2 min-h-[60px]">
          <div className="flex items-center gap-2">
            <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={38} />
            <BtcTextLogo color="#fff" height={36} width={156} />
          </div>
          <ShareCardQr id={SHARE_QR_CANVAS_ID} value={shareUrl} />
        </div>

        {/* 타이틀 */}
        <div className="mb-1.5 text-[26px] font-bold leading-tight tracking-tight">
          비트코인 한국 프리미엄
        </div>

        {/* 상태 뱃지 */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold border"
            style={{
              backgroundColor: `${themeColor}20`,
              borderColor: `${themeColor}40`,
              color: themeColor,
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: themeColor }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: themeColor }}
              />
            </span>
            {isPositive ? "한국 프리미엄" : isNegative ? "역프리미엄" : "동일 시세"}
          </span>
        </div>

        {/* 히어로: 프리미엄 % */}
        <div
          className="mb-6 flex items-baseline gap-1"
          style={{ color: themeColor, filter: `drop-shadow(0 0 25px ${themeColor}60)` }}
        >
          <span className="text-4xl font-black">{isPositive ? "+" : ""}</span>
          <span className="text-[56px] font-black font-number tracking-tight">
            {PremiumPercent.toFixed(2)}
          </span>
          <span className="text-4xl font-black ml-0.5">%</span>
        </div>

        {/* 비교 블록 */}
        <div className="rounded-2xl border border-white/15 bg-black/60 p-4">
          {/* 환율 정보 행 */}
          <div className="mb-4 flex items-center gap-1.5 text-sm font-bold text-white/70">
            {!isUsdtStandard && <span>환율:</span>}
            <span className="text-white font-number">
              1 {!isUsdtStandard ? "USD" : "USDT"} ={" "}
              {usdExRate.toLocaleString("ko-KR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              KRW
            </span>
          </div>

          {/* 한국 거래소 KRW 가격 */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="flex h-2 w-2 rounded-full"
              style={{ backgroundColor: BITCOIN_COLOR }}
            />
            <span className="text-xs font-bold text-white/70">
              {krwMarketLabel} ({krwMarket})
            </span>
          </div>
          <div className="flex items-baseline justify-start gap-2">
            <span className="text-2xl font-black text-white tracking-tight font-number">
              ₩{krw.toLocaleString()}
            </span>
            {currency.includes("KRW") && diffKrw !== 0 && (
              <span
                className="text-sm font-bold tracking-tight font-number"
                style={{ color: themeColor }}
              >
                {diffKrw >= 0 ? "+" : ""}
                {Math.round(diffKrw).toLocaleString()} KRW
              </span>
            )}
          </div>

          <div className="my-3 h-px bg-white/10" />

          {/* 해외 거래소 USD 가격 */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="flex h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-xs font-bold text-white/70">
              {usdMarketLabel} ({usdMarket})
            </span>
          </div>
          <div className="flex items-baseline justify-start gap-2">
            <span className="text-2xl font-black text-white tracking-tight font-number">
              <span className="px-1">$</span>
              {usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
            {currency.includes("USD") && diffUsd !== 0 && (
              <span
                className="text-sm font-bold tracking-tight font-number"
                style={{ color: themeColor }}
              >
                {diffUsd >= 0 ? "+" : ""}
                {diffUsd.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                USD
              </span>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/15 pt-4">
          <span
            className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-white"
            style={{ textShadow: `0 0 14px ${themeColor}80` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
            {SERVICE_DOMAIN}
          </span>
          <span className="font-number min-w-0 truncate text-sm text-white/60">
            {capturedAtKst}
          </span>
        </div>
      </div>
    </div>
  );
}

const MemoizedPremiumShareCard = memo(PremiumShareCard);
MemoizedPremiumShareCard.displayName = "PremiumShareCard";

export { MemoizedPremiumShareCard as PremiumShareCard };
export default MemoizedPremiumShareCard;
