"use client";

import { KIcon } from "kku-ui";
import Image from "next/image";
import { memo, type RefObject, useMemo, useState } from "react";
import {
  type ApartmentYearPoint,
  getApartmentCaptureImagePath,
  getApartmentImagePath,
  type LandmarkApartment,
} from "@/entities/apartment";
import { getCurrentDateTimeKST } from "@/shared/lib/date";
import { BtcTextLogo, WonIcon } from "@/shared/ui";
import {
  buildApartmentShareStats,
  formatBtcCount,
  formatKrwInEok,
  formatMultiple,
} from "../lib/buildShareStats";

/** SNS 확산( 네트워크 효과 )을 위한 서비스 도메인 워터마크 */
const SERVICE_DOMAIN = "ONLY-BTC.APP";

export const APARTMENT_CARD_DESIGN_WIDTH = 440;

const BITCOIN_COLOR = "#F7931A";

/**
 * 배수 뱃지.
 *
 * 폭을 고정하고 왼쪽 맞춤한다. 값 길이가 행마다 다르므로( `9.3억 → 33.1억` vs `1,684 → 36.9` )
 * 그냥 흘려보내면 두 행의 ▲ · ▼ 가 서로 어긋난 자리에서 시작한다.
 */
const MULTIPLE_BADGE_CLASS = "w-[74px] whitespace-nowrap text-left";

export interface ApartmentShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
  landmark: LandmarkApartment | undefined;
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
  bitcoinPriceInKrw: number;
}

function ApartmentShareCard({
  cardRef,
  landmark,
  yearPoints,
  areaInSquareMeter,
  bitcoinPriceInKrw,
}: ApartmentShareCardProps) {
  // region [Hooks]
  // 카드를 연 시각을 고정한다. 다이얼로그가 닫히면 언마운트되므로 열 때마다 다시 계산.
  const [capturedAtKst] = useState<string>(getCurrentDateTimeKST);

  const stats = useMemo(
    () => buildApartmentShareStats({ yearPoints, areaInSquareMeter, bitcoinPriceInKrw }),
    [yearPoints, areaInSquareMeter, bitcoinPriceInKrw],
  );
  // endregion

  // region [Privates]
  const imageSrc = landmark ? getApartmentImagePath(landmark.apartmentID) : "";

  /** 캡처 합성은 최적화 경로로 받는다. 표시용과 캐시를 공유하고 7일 캐시가 걸린다. */
  const captureBackgroundSrc = landmark ? getApartmentCaptureImagePath(landmark.apartmentID) : "";

  /** 원화가 몇 배 올랐는지. 비트코인 배수와 나란히 놓아야 반전이 읽힌다. */
  const krwRiseMultiple = stats ? stats.krw.currentValue / stats.krw.baseValue : 0;
  // endregion

  // region [Templates]
  const HeadlineTemplate = useMemo(() => {
    if (!stats) {
      return <span className="text-5xl font-black text-white/60">—</span>;
    }

    return (
      <span className="font-number text-[56px] leading-none font-black tracking-tight text-white">
        {formatBtcCount(stats.btc.currentValue)}
        <span className="ml-2 text-2xl font-black" style={{ color: BITCOIN_COLOR }}>
          BTC
        </span>
      </span>
    );
  }, [stats]);

  /**
   * 카드의 전부인 블록.
   *
   * 같은 아파트·같은 기간인데 위아래 줄의 방향이 반대다. 원화 줄을 위에 두면
   * "올랐다" 로 읽히고 끝나므로, 비트코인 줄을 강조색으로 아래에 놓아 결론이 되게 한다.
   */
  const ComparisonTemplate = useMemo(() => {
    if (!stats) {
      return null;
    }

    return (
      <div className="rounded-2xl border border-white/15 bg-black/60 p-4">
        <div className="mb-3 font-number text-sm font-bold tracking-widest text-white/80">
          {stats.baseYear} → {stats.latestYear}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[15px] font-bold text-white/70">
            <WonIcon size={19} />
            원화로는
          </span>
          <span className="flex items-center gap-3 text-[15px] font-bold text-white/70">
            <span>
              <span className="font-number">{formatKrwInEok(stats.krw.baseValue)}</span>억 {` → `}
              <span className="font-number">{formatKrwInEok(stats.krw.currentValue)}</span>억
            </span>
            <span className={`${MULTIPLE_BADGE_CLASS} text-[#FF6B6B]`}>
              ▲ <span className="font-number">{krwRiseMultiple.toFixed(1)}</span>배
            </span>
          </span>
        </div>

        <div className="my-3 h-px bg-white/10" />

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[15px] font-bold text-white">
            <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={19} />
            비트코인으로는
          </span>
          <span className="flex items-center gap-3 text-[15px] font-bold text-white">
            <div>
              <span className="font-number">{formatBtcCount(stats.btc.baseValue)}</span>
              {` → `}
              <span className="font-number">{formatBtcCount(stats.btc.currentValue)}</span>
            </div>
            <span className={MULTIPLE_BADGE_CLASS} style={{ color: BITCOIN_COLOR }}>
              ▼ <span className="font-number">{formatMultiple(stats.btcCheaperMultiple)}</span>배
            </span>
          </span>
        </div>
      </div>
    );
  }, [stats, krwRiseMultiple]);

  const PunchlineTemplate = useMemo(() => {
    if (!stats) {
      return null;
    }

    return (
      <p className="mt-3 text-[15px] font-bold leading-relaxed text-white/85">
        같은 집인데 원화로는{" "}
        <span className="text-[#FF6B6B]">
          <span className="font-number">{krwRiseMultiple.toFixed(1)}</span>배 비싸졌고
        </span>
        ,
        <br />
        비트코인으로는{" "}
        <span style={{ color: BITCOIN_COLOR }}>
          <span className="font-number">{formatMultiple(stats.btcCheaperMultiple)}</span>배
          싸졌습니다.
        </span>
      </p>
    );
  }, [stats, krwRiseMultiple]);
  // endregion

  return (
    /*
      루트에 배경색을 두지 않는다. 캡처 후 canvas **아래**로 사진을 합성하는 방식이라
      ( `registerCaptureBackground` ) 사진이 보일 자리가 투명해야 한다.
    */
    <div
      ref={cardRef}
      data-background-src={captureBackgroundSrc}
      className="font-pretendard relative w-[440px] overflow-hidden rounded-[32px] select-none"
    >
      {/* 단지 사진. 캡처에서는 제외하고 canvas 에 직접 합성한다. */}
      {imageSrc && (
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="440px"
          priority
          className="object-cover"
          data-capture-ignore=""
          draggable={false}
        />
      )}

      {/* 글자가 사진 어디에 얹혀도 읽히도록 아래로 갈수록 짙어지는 막을 깐다. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/75 to-black/90" />

      <div className="relative flex flex-col p-6 text-white">
        {/* 급등 알림 카드와 같은 규격. 두 카드가 같은 서비스에서 나온 것으로 읽혀야 한다. */}
        <div className="mb-8 flex items-center gap-2">
          <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={38} />
          <BtcTextLogo color="#fff" height={36} width={156} />
        </div>

        <div className="mb-1 text-[26px] font-bold leading-tight tracking-tight">
          {landmark?.displayName ?? "-"}
        </div>
        <div className="mb-6 text-sm font-medium text-white/60">
          {landmark ? `${landmark.districtName} ${landmark.legalDongName}` : ""}
          {areaInSquareMeter !== null && (
            <>
              {" · 전용 "}
              <span className="font-number">{areaInSquareMeter}</span>㎡
            </>
          )}
        </div>

        <div className="mb-1 text-sm font-bold text-white/60">지금 이 집 한 채의 값</div>
        <div className="mb-6">{HeadlineTemplate}</div>

        {ComparisonTemplate}
        {PunchlineTemplate}

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/15 pt-4">
          <span
            className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-white"
            style={{ textShadow: `0 0 14px ${BITCOIN_COLOR}80` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BITCOIN_COLOR }} />
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

const MemoizedApartmentShareCard = memo(ApartmentShareCard);
MemoizedApartmentShareCard.displayName = "ApartmentShareCard";

export { MemoizedApartmentShareCard as ApartmentShareCard };
export default MemoizedApartmentShareCard;
