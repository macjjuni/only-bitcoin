"use client";

import { KIcon } from "kku-ui";
import Image from "next/image";
import { memo, type RefObject, useEffect, useMemo, useState } from "react";
import { QRCode } from "react-qrcode-logo";
import {
  type ApartmentYearPoint,
  getApartmentCaptureImagePath,
  getApartmentImagePath,
  type LandmarkApartment,
} from "@/entities/apartment";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { env } from "@/shared/config/env";
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

/**
 * 배수 뱃지.
 *
 * 폭을 고정하고 왼쪽 맞춤한다. 값 길이가 행마다 다르므로( `9.3억 → 33.1억` vs `1,684개 → 36.9개` )
 * 그냥 흘려보내면 두 행의 ▲ · ▼ 가 서로 어긋난 자리에서 시작한다.
 */
const MULTIPLE_BADGE_CLASS = "w-[70px] whitespace-nowrap text-left";

/**
 * 비교 행의 글자 크기.
 *
 * 440px 안에 라벨 · 값 · 배수 뱃지가 한 줄로 들어가야 함.
 * 15px 에 단위( `개` )까지 붙이면 한글 폰트가 넓은 기기에서 라벨이 두 줄로 접힘.
 */
const COMPARISON_ROW_CLASS = "text-[14px] font-bold";

/** QR 표시 크기( 디자인 px ). */
const SHARE_QR_SIZE = 48;

/** 흰 판 여백. 코드 둘레의 quiet zone 을 겸함. */
const SHARE_QR_PADDING = 4;

/** canvas 를 표시 크기의 몇 배로 그릴지. 캡처 배율과 맞춰야 확대해도 안 뭉개짐. */
const SHARE_QR_RENDER_SCALE = 3;

/** 캡처 후 합성할 때 다이얼로그가 QR canvas 를 찾는 id. */
export const SHARE_QR_CANVAS_ID = "apartment-share-qr";

/**
 * 카드에 실을 공유 주소.
 *
 * 현재 경로 · 쿼리( `?apartment=...` )를 그대로 쓰고 도메인만 서비스 주소로 고정함.
 * 로컬에서 캡처한 카드에 `localhost` QR 이 박히면 받은 사람이 못 엶.
 */
function buildCurrentShareUrl(): string {
  if (typeof window === "undefined") {
    return env.NEXT_PUBLIC_URL;
  }

  return new URL(
    `${window.location.pathname}${window.location.search}`,
    env.NEXT_PUBLIC_URL,
  ).toString();
}

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

  /** 마운트 후에 채움. 초기값으로 `window` 를 읽으면 서버 렌더와 어긋남. */
  const [shareUrl, setShareUrl] = useState("");

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
          <span
            className={`${COMPARISON_ROW_CLASS} flex items-center gap-2 whitespace-nowrap text-white/70`}
          >
            <WonIcon size={19} />
            원화로는
          </span>
          <span className={`${COMPARISON_ROW_CLASS} flex items-center gap-3 text-white/70`}>
            <span className="whitespace-nowrap">
              <span className="font-number">{formatKrwInEok(stats.krw.baseValue)}</span>억{` → `}
              <span className="font-number">{formatKrwInEok(stats.krw.currentValue)}</span>억
            </span>
            <span className={`${MULTIPLE_BADGE_CLASS} text-[#FF6B6B]`}>
              ▲ <span className="font-number">{krwRiseMultiple.toFixed(1)}</span>배
            </span>
          </span>
        </div>

        <div className="my-3 h-px bg-white/10" />

        <div className="flex items-center justify-between gap-3">
          <span
            className={`${COMPARISON_ROW_CLASS} flex items-center gap-2 whitespace-nowrap text-white`}
          >
            <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={19} />
            비트코인으로는
          </span>
          <span className={`${COMPARISON_ROW_CLASS} flex items-center gap-3 text-white`}>
            <span className="whitespace-nowrap">
              <span className="font-number">{formatBtcCount(stats.btc.baseValue)}</span>개{` → `}
              <span className="font-number">{formatBtcCount(stats.btc.currentValue)}</span>개
            </span>
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
      <p className="text-[15px] font-bold leading-relaxed text-white/85">
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

  /** 카드는 이미지로만 퍼짐. 도메인 워터마크로는 **지금 이 단지**로 못 보냄. */
  const ShareQrTemplate = useMemo(() => {
    if (!shareUrl) {
      return null;
    }

    return (
      /* QR 은 밝은 바탕에서만 읽힘. canvas 가 캡처에서 빠져도 안 무너지게 크기를 고정함. */
      <div
        className="ml-auto flex-none rounded-lg bg-white"
        style={{
          width: SHARE_QR_SIZE + SHARE_QR_PADDING * 2,
          height: SHARE_QR_SIZE + SHARE_QR_PADDING * 2,
          padding: SHARE_QR_PADDING,
        }}
      >
        {/*
          canvas 는 캡처에서 빼고 `ApartmentShareDialog` 가 결과 canvas 에 직접 합성함.
          단지 사진 · 코인 이미지와 같은 이유. ( Safari 는 foreignObject 안의 이미지를
          못 그리는 경우가 있어 그대로 두면 QR 만 빈칸으로 나옴 )
        */}
        <span data-capture-ignore="" className="block">
          <QRCode
            id={SHARE_QR_CANVAS_ID}
            value={shareUrl}
            size={SHARE_QR_SIZE * SHARE_QR_RENDER_SCALE}
            quietZone={0}
            ecLevel="M"
            style={{ display: "block", width: SHARE_QR_SIZE, height: SHARE_QR_SIZE }}
          />
        </span>
      </div>
    );
  }, [shareUrl]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setShareUrl(buildCurrentShareUrl());
  }, []);
  // endregion

  return (
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

        <div className="mt-3 flex items-center gap-4">
          {PunchlineTemplate}
          {ShareQrTemplate}
        </div>

        {/* {MethodologyTemplate} */}
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
