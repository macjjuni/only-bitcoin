"use client";

import { memo, type ReactNode, type RefObject } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import type { ImageCaptureOptions } from "@/shared/lib/imageExport";
import { ShareCardExportDialog } from "@/shared/ui";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { useShareCardChart } from "../model/useShareCardChart";
import BtcSurgeShareCard, {
  BTC_SURGE_CARD_DESIGN_WIDTH,
  COIN_OVERLAY_BASE,
} from "./BtcSurgeShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-app.png";
const SHARE_TITLE = "ONLY-BTC.APP 비트코인 시세 알림";

// region [Privates]
const createBtcSurgeCaptureOptions = (cardElement: HTMLDivElement): ImageCaptureOptions => {
  const themeColor = cardElement.dataset.themeColor ?? BITCOIN_COLOR;

  return {
    overlays: [
      {
        ...COIN_OVERLAY_BASE,
        shadowColor: `${themeColor}80`,
      },
    ],
  };
};

const renderBtcSurgeShareCard = (cardReference: RefObject<HTMLDivElement | null>): ReactNode => {
  return <BtcSurgeShareCard cardRef={cardReference} />;
};
// endregion

function BtcSurgeShareDialog() {
  // region [Hooks]
  const isOpen = useBtcSurgeShareStore((state) => state.isOpen);
  const closeModal = useBtcSurgeShareStore((state) => state.closeModal);
  const { isChartDataReady } = useShareCardChart(isOpen);
  // endregion

  return (
    <ShareCardExportDialog
      isOpen={isOpen}
      title="비트코인 급등 알림 카드"
      description="SNS 캡처 및 공유용 비트코인 실시간 급등 알림 카드입니다."
      cardDesignWidthInPixels={BTC_SURGE_CARD_DESIGN_WIDTH}
      imageFileName={SHARE_IMAGE_FILE_NAME}
      shareTitle={SHARE_TITLE}
      renderCard={renderBtcSurgeShareCard}
      onClose={closeModal}
      createCaptureOptions={createBtcSurgeCaptureOptions}
      isExportReady={isChartDataReady}
      contentTopClassName="!top-[42%]"
    />
  );
}

const MemoizedBtcSurgeShareDialog = memo(BtcSurgeShareDialog);
MemoizedBtcSurgeShareDialog.displayName = "BtcSurgeShareDialog";

export default MemoizedBtcSurgeShareDialog;
