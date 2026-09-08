"use client";

import { memo, type ReactNode, type RefObject } from "react";
import { createCanvasCaptureOverlay, type ImageCaptureOptions } from "@/shared/lib/imageExport";
import { ShareCardExportDialog } from "@/shared/ui";
import { usePremiumShareStore } from "../model/usePremiumShareStore";
import PremiumShareCard, {
  PREMIUM_SHARE_CARD_DESIGN_WIDTH,
  SHARE_QR_CANVAS_ID,
} from "./PremiumShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-premium.png";
const SHARE_TITLE = "ONLY-BTC.APP 비트코인 한국 프리미엄 현황";

// region [Privates]
const createPremiumShareCaptureOptions = (cardElement: HTMLDivElement): ImageCaptureOptions => {
  const qrCanvas = cardElement.querySelector<HTMLCanvasElement>(`#${SHARE_QR_CANVAS_ID}`);
  const overlays = qrCanvas
    ? [createCanvasCaptureOverlay(cardElement, qrCanvas, PREMIUM_SHARE_CARD_DESIGN_WIDTH)]
    : [];

  return {
    backgroundSrc: cardElement.dataset.backgroundSrc,
    overlays,
  };
};

const renderPremiumShareCard = (cardReference: RefObject<HTMLDivElement | null>): ReactNode => {
  return <PremiumShareCard cardRef={cardReference} />;
};
// endregion

function PremiumShareDialog() {
  // region [Hooks]
  const isOpen = usePremiumShareStore((state) => state.isOpen);
  const closeModal = usePremiumShareStore((state) => state.closeModal);
  // endregion

  return (
    <ShareCardExportDialog
      isOpen={isOpen}
      title="비트코인 프리미엄 카드로 공유하기"
      description="실시간 비트코인 한국 프리미엄 현황 카드 이미지를 생성하여 공유합니다."
      cardDesignWidthInPixels={PREMIUM_SHARE_CARD_DESIGN_WIDTH}
      imageFileName={SHARE_IMAGE_FILE_NAME}
      shareTitle={SHARE_TITLE}
      renderCard={renderPremiumShareCard}
      onClose={closeModal}
      createCaptureOptions={createPremiumShareCaptureOptions}
      closeButtonRowClassName="mb-2.5"
      actionButtonClassName="font-extrabold"
      shouldNotifyDownloadSuccess
    />
  );
}

const MemoizedPremiumShareDialog = memo(PremiumShareDialog);
MemoizedPremiumShareDialog.displayName = "PremiumShareDialog";

export default MemoizedPremiumShareDialog;
