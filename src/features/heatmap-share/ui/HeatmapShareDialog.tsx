"use client";

import { memo, type ReactNode, type RefObject, useCallback, useEffect } from "react";
import { createCanvasCaptureOverlay, type ImageCaptureOptions } from "@/shared/lib/imageExport";
import { ShareCardExportDialog } from "@/shared/ui";
import type { HeatmapShareData } from "../model/types";
import { useHeatmapShareStore } from "../model/useHeatmapShareStore";
import HeatmapShareCard, {
  HEATMAP_SHARE_CARD_DESIGN_WIDTH,
  SHARE_QR_CANVAS_ID,
} from "./HeatmapShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-heatmap.png";
const SHARE_TITLE = "ONLY-BTC.APP 코인 시가총액 히트맵";

export interface HeatmapShareDialogProps {
  data: HeatmapShareData;
}

// region [Privates]
/** QR 은 canvas 라 캡처 뒤에 따로 합성함. 배경은 CSS 라 합성할 게 없음. */
const createHeatmapShareCaptureOptions = (cardElement: HTMLDivElement): ImageCaptureOptions => {
  const qrCanvas = cardElement.querySelector<HTMLCanvasElement>(`#${SHARE_QR_CANVAS_ID}`);

  return {
    overlays: qrCanvas
      ? [createCanvasCaptureOverlay(cardElement, qrCanvas, HEATMAP_SHARE_CARD_DESIGN_WIDTH)]
      : [],
  };
};
// endregion

function HeatmapShareDialog({ data }: HeatmapShareDialogProps) {
  // region [Hooks]
  const isOpen = useHeatmapShareStore((state) => state.isOpen);
  const closeModal = useHeatmapShareStore((state) => state.closeModal);
  const renderHeatmapShareCard = useCallback(
    (cardReference: RefObject<HTMLDivElement | null>): ReactNode => {
      return <HeatmapShareCard cardRef={cardReference} data={data} />;
    },
    [data],
  );
  // endregion

  // region [Life Cycles]
  // 연 채로 화면을 떠나면 스토어에 열림이 남아서, 돌아왔을 때 모달이 혼자 다시 뜸.
  useEffect(() => {
    return closeModal;
  }, [closeModal]);
  // endregion

  return (
    <ShareCardExportDialog
      isOpen={isOpen}
      title="시가총액 히트맵 카드"
      description="SNS 캡처 및 공유용 코인 시가총액 히트맵 카드입니다."
      cardDesignWidthInPixels={HEATMAP_SHARE_CARD_DESIGN_WIDTH}
      imageFileName={SHARE_IMAGE_FILE_NAME}
      shareTitle={SHARE_TITLE}
      renderCard={renderHeatmapShareCard}
      onClose={closeModal}
      createCaptureOptions={createHeatmapShareCaptureOptions}
    />
  );
}

const MemoizedHeatmapShareDialog = memo(HeatmapShareDialog);
MemoizedHeatmapShareDialog.displayName = "HeatmapShareDialog";

export default MemoizedHeatmapShareDialog;
