"use client";

import { memo, type ReactNode, type RefObject } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import type { ImageCaptureOptions } from "@/shared/lib/imageExport";
import { ShareCardExportDialog } from "@/shared/ui";
import type { ShareCardLayout } from "../model/shareCardLayout";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { useShareCardChart } from "../model/useShareCardChart";
import BtcSurgeLayoutSelector from "./BtcSurgeLayoutSelector";
import BtcSurgeShareCard, {
  BTC_SURGE_CARD_DESIGN_WIDTH,
  COIN_OVERLAY_BASE,
} from "./BtcSurgeShareCard";
import BtcSurgeWideShareCard, { BTC_SURGE_WIDE_CARD_DESIGN_WIDTH } from "./BtcSurgeWideShareCard";

const SHARE_TITLE = "ONLY-BTC.APP 비트코인 시세 알림";

/**
 * 가로형 카드 캡처 배율.
 *
 * 디자인 폭이 정사각 카드( 440px )의 두 배라 기본 3배를 그대로 쓰면 2640×1386 이 나온다.
 * X 권장 업로드 크기가 1200px 폭이므로 2배( 1760×924 )면 리타이나에서도 충분하고
 * 결과 PNG 용량은 절반 이하로 줄어든다.
 */
const WIDE_CARD_CAPTURE_PIXEL_RATIO = 2;

// region [Privates]
/**
 * 정사각 카드는 3D 코인을 캡처 후 canvas 에 직접 합성한다.
 * ( Safari 가 foreignObject 안의 이미지를 못 그리는 경우가 있어 우회한다 )
 */
const createSquareCaptureOptions = (cardElement: HTMLDivElement): ImageCaptureOptions => {
  const themeColor = cardElement.dataset.themeColor ?? BITCOIN_COLOR;

  return {
    overlays: [{ ...COIN_OVERLAY_BASE, shadowColor: `${themeColor}80` }],
  };
};

/** 가로형 카드는 덧그릴 이미지가 없어 배율만 지정한다. */
const createWideCaptureOptions = (): ImageCaptureOptions => ({
  pixelRatio: WIDE_CARD_CAPTURE_PIXEL_RATIO,
});

const renderSquareCard = (cardReference: RefObject<HTMLDivElement | null>): ReactNode => (
  <BtcSurgeShareCard cardRef={cardReference} />
);

const renderWideCard = (cardReference: RefObject<HTMLDivElement | null>): ReactNode => (
  <BtcSurgeWideShareCard cardRef={cardReference} />
);
// endregion

interface ShareCardLayoutConfig {
  title: string;
  description: string;
  cardDesignWidthInPixels: number;
  imageFileName: string;
  contentWidthClassName: string;
  contentTopClassName: string;
  renderCard: (cardReference: RefObject<HTMLDivElement | null>) => ReactNode;
  createCaptureOptions: (cardElement: HTMLDivElement) => ImageCaptureOptions;
}

/** 레이아웃별로 달라지는 값. 다이얼로그 본체는 이 표만 바꿔 끼운다. */
const SHARE_CARD_LAYOUT_CONFIG: Record<ShareCardLayout, ShareCardLayoutConfig> = {
  square: {
    title: "비트코인 급등 알림 카드",
    description: "SNS 캡처 및 공유용 비트코인 실시간 급등 알림 카드입니다.",
    cardDesignWidthInPixels: BTC_SURGE_CARD_DESIGN_WIDTH,
    imageFileName: "only-btc-app.png",
    contentWidthClassName: "w-[92vw] max-w-[460px]",
    contentTopClassName: "!top-[42%]",
    renderCard: renderSquareCard,
    createCaptureOptions: createSquareCaptureOptions,
  },
  wide: {
    title: "비트코인 급등 알림 가로형 카드",
    description: "X( 트위터 ) 업로드에 맞춘 가로형 비트코인 실시간 급등 알림 카드입니다.",
    cardDesignWidthInPixels: BTC_SURGE_WIDE_CARD_DESIGN_WIDTH,
    imageFileName: "only-btc-app-wide.png",
    contentWidthClassName: "w-[92vw] max-w-[920px]",
    contentTopClassName: "!top-[46%]",
    renderCard: renderWideCard,
    createCaptureOptions: createWideCaptureOptions,
  },
};

function BtcSurgeShareDialog() {
  // region [Hooks]
  const isOpen = useBtcSurgeShareStore((state) => state.isOpen);
  const closeModal = useBtcSurgeShareStore((state) => state.closeModal);
  const layout = useBtcSurgeShareStore((state) => state.layout);
  const setLayout = useBtcSurgeShareStore((state) => state.setLayout);
  const { isChartDataReady } = useShareCardChart(isOpen);

  const layoutConfig = SHARE_CARD_LAYOUT_CONFIG[layout];
  // endregion

  // region [Events]
  const onChangeLayout = (selectedLayout: ShareCardLayout) => {
    setLayout(selectedLayout);
  };
  // endregion

  // region [Templates]
  const LayoutSelectorTemplate = (
    <BtcSurgeLayoutSelector selectedLayout={layout} onChangeLayout={onChangeLayout} />
  );
  // endregion

  return (
    <ShareCardExportDialog
      isOpen={isOpen}
      title={layoutConfig.title}
      description={layoutConfig.description}
      cardDesignWidthInPixels={layoutConfig.cardDesignWidthInPixels}
      imageFileName={layoutConfig.imageFileName}
      shareTitle={SHARE_TITLE}
      renderCard={layoutConfig.renderCard}
      createCaptureOptions={layoutConfig.createCaptureOptions}
      contentWidthClassName={layoutConfig.contentWidthClassName}
      contentTopClassName={layoutConfig.contentTopClassName}
      headerActions={LayoutSelectorTemplate}
      onClose={closeModal}
      isExportReady={isChartDataReady}
    />
  );
}

const MemoizedBtcSurgeShareDialog = memo(BtcSurgeShareDialog);
MemoizedBtcSurgeShareDialog.displayName = "BtcSurgeShareDialog";

export default MemoizedBtcSurgeShareDialog;
