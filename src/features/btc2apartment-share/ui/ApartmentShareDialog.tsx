"use client";

import { memo, type ReactNode, type RefObject, useCallback } from "react";
import type { ApartmentYearPoint, LandmarkApartment } from "@/entities/apartment";
import { useBitcoinStore } from "@/entities/bitcoin";
import { createCanvasCaptureOverlay, type ImageCaptureOptions } from "@/shared/lib/imageExport";
import { ShareCardExportDialog } from "@/shared/ui";
import { useApartmentShareStore } from "../model/useApartmentShareStore";
import ApartmentShareCard, {
  APARTMENT_CARD_DESIGN_WIDTH,
  SHARE_QR_CANVAS_ID,
} from "./ApartmentShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-app-apartment.png";
const SHARE_TITLE = "ONLY-BTC.APP 아파트 비트코인 환산";

export interface ApartmentShareDialogProps {
  landmark: LandmarkApartment | undefined;
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
}

// region [Privates]
const createApartmentShareCaptureOptions = (cardElement: HTMLDivElement): ImageCaptureOptions => {
  const qrCanvas = cardElement.querySelector<HTMLCanvasElement>(`#${SHARE_QR_CANVAS_ID}`);
  const overlays = qrCanvas
    ? [createCanvasCaptureOverlay(cardElement, qrCanvas, APARTMENT_CARD_DESIGN_WIDTH)]
    : [];

  return {
    backgroundSrc: cardElement.dataset.backgroundSrc,
    overlays,
  };
};
// endregion

function ApartmentShareDialog({
  landmark,
  yearPoints,
  areaInSquareMeter,
}: ApartmentShareDialogProps) {
  // region [Hooks]
  const isOpen = useApartmentShareStore((state) => state.isOpen);
  const closeModal = useApartmentShareStore((state) => state.closeModal);
  const bitcoinPriceInKrw = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const renderApartmentShareCard = useCallback(
    (cardReference: RefObject<HTMLDivElement | null>): ReactNode => {
      return (
        <ApartmentShareCard
          cardRef={cardReference}
          landmark={landmark}
          yearPoints={yearPoints}
          areaInSquareMeter={areaInSquareMeter}
          bitcoinPriceInKrw={bitcoinPriceInKrw}
        />
      );
    },
    [areaInSquareMeter, bitcoinPriceInKrw, landmark, yearPoints],
  );
  // endregion

  return (
    <ShareCardExportDialog
      isOpen={isOpen}
      title="아파트 비트코인 환산 카드"
      description="SNS 캡처 및 공유용 아파트 실거래가 비트코인 환산 카드입니다."
      cardDesignWidthInPixels={APARTMENT_CARD_DESIGN_WIDTH}
      imageFileName={SHARE_IMAGE_FILE_NAME}
      shareTitle={SHARE_TITLE}
      renderCard={renderApartmentShareCard}
      onClose={closeModal}
      createCaptureOptions={createApartmentShareCaptureOptions}
    />
  );
}

const MemoizedApartmentShareDialog = memo(ApartmentShareDialog);
MemoizedApartmentShareDialog.displayName = "ApartmentShareDialog";

export default MemoizedApartmentShareDialog;
