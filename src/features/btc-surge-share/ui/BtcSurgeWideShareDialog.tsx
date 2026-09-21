"use client";

import { memo, type ReactNode, type RefObject } from "react";
import type { ImageCaptureOptions } from "@/shared/lib/imageExport";
import { ShareCardExportDialog } from "@/shared/ui";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { useShareCardChart } from "../model/useShareCardChart";
import BtcSurgeWideShareCard, { BTC_SURGE_WIDE_CARD_DESIGN_WIDTH } from "./BtcSurgeWideShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-app-wide.png";
const SHARE_TITLE = "ONLY-BTC.APP 비트코인 시세 알림";

/**
 * 가로형 카드 캡처 배율.
 *
 * 디자인 폭이 정사각 카드( 440px )의 두 배라 기본 3배를 그대로 쓰면 2640×1386 이 나온다.
 * X 권장 업로드 크기가 1200px 폭이므로 2배( 1760×924 )면 리타이나에서도 충분하고
 * 결과 PNG 용량은 절반 이하로 줄어든다.
 */
const WIDE_CARD_CAPTURE_PIXEL_RATIO = 2;

/**
 * 가로형 카드는 캔버스에 덧그릴 오버레이가 없어 배율만 지정한다.
 * ( 정사각 카드의 3D 코인처럼 `html-to-image` 가 못 그리는 이미지가 이 카드엔 없다 )
 */
const WIDE_CARD_CAPTURE_OPTIONS: ImageCaptureOptions = {
  pixelRatio: WIDE_CARD_CAPTURE_PIXEL_RATIO,
};

// region [Privates]
const createBtcSurgeWideCaptureOptions = (): ImageCaptureOptions => WIDE_CARD_CAPTURE_OPTIONS;

const renderBtcSurgeWideShareCard = (
  cardReference: RefObject<HTMLDivElement | null>,
): ReactNode => {
  return <BtcSurgeWideShareCard cardRef={cardReference} />;
};
// endregion

function BtcSurgeWideShareDialog() {
  // region [Hooks]
  const isWideOpen = useBtcSurgeShareStore((state) => state.isWideOpen);
  const closeWideModal = useBtcSurgeShareStore((state) => state.closeWideModal);
  const { isChartDataReady } = useShareCardChart(isWideOpen);
  // endregion

  return (
    <ShareCardExportDialog
      isOpen={isWideOpen}
      title="비트코인 급등 알림 가로형 카드"
      description="X( 트위터 ) 업로드에 맞춘 가로형 비트코인 실시간 급등 알림 카드입니다."
      cardDesignWidthInPixels={BTC_SURGE_WIDE_CARD_DESIGN_WIDTH}
      imageFileName={SHARE_IMAGE_FILE_NAME}
      shareTitle={SHARE_TITLE}
      renderCard={renderBtcSurgeWideShareCard}
      onClose={closeWideModal}
      createCaptureOptions={createBtcSurgeWideCaptureOptions}
      isExportReady={isChartDataReady}
      contentWidthClassName="w-[92vw] max-w-[920px]"
      contentTopClassName="!top-[46%]"
    />
  );
}

const MemoizedBtcSurgeWideShareDialog = memo(BtcSurgeWideShareDialog);
MemoizedBtcSurgeWideShareDialog.displayName = "BtcSurgeWideShareDialog";

export default MemoizedBtcSurgeWideShareDialog;
