"use client";

import {
  KButton,
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
  kToast,
} from "kku-ui";
import { Copy, Download, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  captureElementToPngBlob,
  captureElementToPngDataUrl,
  clearCaptureOverlays,
  copyPngToClipboard,
  registerCaptureBackground,
  createPngFile,
  downloadImageFromDataUrl,
  isAndroid,
  isImageClipboardSupported,
  isImageFileShareSupported,
  isIos,
  isShareAbortedByUser,
  registerCaptureOverlay,
} from "@/shared/lib/imageExport";
import { usePremiumShareStore } from "../model/usePremiumShareStore";
import PremiumShareCard, {
  PREMIUM_SHARE_CARD_DESIGN_WIDTH,
  SHARE_QR_CANVAS_ID,
} from "./PremiumShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-premium.png";
const SHARE_TITLE = "ONLY-BTC.APP 비트코인 한국 프리미엄 현황";

function PremiumShareDialog() {
  // region [Hooks]
  const isOpen = usePremiumShareStore((state) => state.isOpen);
  const closeModal = usePremiumShareStore((state) => state.closeModal);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardScaleAreaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const [scaledCardHeight, setScaledCardHeight] = useState<number>();
  const [isIosDevice, setIsIosDevice] = useState(false);
  // endregion

  // region [Privates]
  const updateCardScale = useCallback(() => {
    const scaleArea = cardScaleAreaRef.current;
    const cardElement = cardRef.current;

    if (!scaleArea || !cardElement) {
      return;
    }

    const nextCardScale = Math.min(1, scaleArea.clientWidth / PREMIUM_SHARE_CARD_DESIGN_WIDTH);
    setCardScale(nextCardScale);
    setScaledCardHeight(cardElement.offsetHeight * nextCardScale);
  }, []);

  const setCardScaleAreaRef = useCallback(
    (scaleArea: HTMLDivElement | null) => {
      cardScaleAreaRef.current = scaleArea;
      const cardElement = cardRef.current;
      if (!scaleArea || !cardElement) return;

      updateCardScale();

      const resizeObserver = new ResizeObserver(updateCardScale);
      resizeObserver.observe(scaleArea);
      resizeObserver.observe(cardElement);

      return () => resizeObserver.disconnect();
    },
    [updateCardScale],
  );

  /** 캡처 직전 카드 DOM 에서 사진 경로를 읽어 배경 합성에 등록함. */
  const registerBackgroundFromCard = useCallback(() => {
    const backgroundSrc = cardRef.current?.dataset.backgroundSrc;

    if (backgroundSrc) {
      registerCaptureBackground(backgroundSrc);
    }
  }, []);

  /**
   * 캡처 직전 QR canvas 를 오버레이로 등록함.
   *
   * 카드가 `transform` 으로 축소돼 있어 화면 좌표를 디자인 좌표( 440px )로 되돌려 넘김.
   * 합성은 항상 원본 크기에서 일어남.
   */
  const registerQrOverlayFromCard = useCallback(() => {
    const cardElement = cardRef.current;
    const qrCanvas = cardElement?.querySelector<HTMLCanvasElement>(`#${SHARE_QR_CANVAS_ID}`);

    if (!cardElement || !qrCanvas) {
      return;
    }

    const cardRect = cardElement.getBoundingClientRect();
    const qrRect = qrCanvas.getBoundingClientRect();
    const displayScale = cardRect.width / PREMIUM_SHARE_CARD_DESIGN_WIDTH;

    registerCaptureOverlay({
      src: qrCanvas.toDataURL(),
      size: qrRect.width / displayScale,
      top: (qrRect.top - cardRect.top) / displayScale,
      left: (qrRect.left - cardRect.left) / displayScale,
    });
  }, []);

  useEffect(() => {
    setIsIosDevice(isIos());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);
  // endregion

  // region [Events]
  const handleClickCopy = useCallback(async () => {
    const cardElement = cardRef.current;
    if (!cardElement || isExporting) return;

    setIsExporting(true);
    registerBackgroundFromCard();
    registerQrOverlayFromCard();

    try {
      if (isIosDevice || isAndroid()) {
        const pngBlob = await captureElementToPngBlob(cardElement);
        const imageFile = createPngFile(pngBlob, SHARE_IMAGE_FILE_NAME);

        if (!isImageFileShareSupported(imageFile)) {
          kToast.error("이 브라우저에서는 공유 기능을 이용할 수 없습니다.");
          return;
        }

        try {
          await navigator.share({
            title: SHARE_TITLE,
            files: [imageFile],
          });
        } catch (shareError) {
          if (!isShareAbortedByUser(shareError)) {
            throw shareError;
          }
        }
        return;
      }

      if (!isImageClipboardSupported()) {
        kToast.error("이 브라우저는 클립보드 이미지 복사를 지원하지 않습니다.");
        return;
      }

      await copyPngToClipboard(() => captureElementToPngBlob(cardElement));
      kToast.success("이미지가 클립보드에 복사되었습니다.");
    } catch {
      kToast.error("이미지 복사에 실패했습니다.");
    } finally {
      clearCaptureOverlays();
      setIsExporting(false);
    }
  }, [isExporting, isIosDevice, registerBackgroundFromCard, registerQrOverlayFromCard]);

  const handleClickDownload = useCallback(async () => {
    const cardElement = cardRef.current;
    if (!cardElement || isExporting) return;

    setIsExporting(true);
    registerBackgroundFromCard();
    registerQrOverlayFromCard();

    try {
      const pngDataUrl = await captureElementToPngDataUrl(cardElement);
      downloadImageFromDataUrl(pngDataUrl, SHARE_IMAGE_FILE_NAME);
      kToast.success("이미지가 다운로드되었습니다.");
    } catch {
      kToast.error("이미지 저장에 실패했습니다.");
    } finally {
      clearCaptureOverlays();
      setIsExporting(false);
    }
  }, [isExporting, registerBackgroundFromCard, registerQrOverlayFromCard]);
  // endregion

  if (!isOpen) return null;

  return (
    <KDialog open={isOpen} onOpenChange={(open) => !open && closeModal()} blur={3} size="md">
      <KDialogOverlay className="z-50 bg-black/70 backdrop-blur-md" />
      <KDialogContent className="fixed left-1/2 top-[45%] z-50 p-0 border-none bg-transparent shadow-none max-w-[460px] w-[92vw] -translate-x-1/2 -translate-y-1/2 outline-none [&>button]:hidden">
        <KDialogHeader className="sr-only">
          <KDialogTitle>비트코인 프리미엄 카드로 공유하기</KDialogTitle>
          <KDialogDescription>
            실시간 비트코인 한국 프리미엄 현황 카드 이미지를 생성하여 공유합니다.
          </KDialogDescription>
        </KDialogHeader>

        <div className="flex flex-col items-center w-full min-w-0">
          <div className="w-full flex justify-end mb-2.5">
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer backdrop-blur-sm border border-neutral-700/50 flex-shrink-0"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {/* 카드 축소 래퍼 영역 */}
          <div ref={setCardScaleAreaRef} className="w-full flex justify-center">
            <div
              className="overflow-hidden rounded-3xl"
              style={{
                width: PREMIUM_SHARE_CARD_DESIGN_WIDTH * cardScale,
                height: scaledCardHeight,
              }}
            >
              <div
                style={{
                  width: PREMIUM_SHARE_CARD_DESIGN_WIDTH,
                  transform: `scale(${cardScale})`,
                  transformOrigin: "top left",
                }}
              >
                <PremiumShareCard cardRef={cardRef} />
              </div>
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center gap-2 mt-4 w-full max-w-[440px]">
            <KButton
              width="full"
              size="lg"
              onClick={handleClickCopy}
              disabled={isExporting}
              className="h-[44px] gap-2 !text-white bg-bitcoin rounded-3xl font-extrabold"
            >
              <Copy size={18} />
              {isExporting ? "처리 중..." : isIosDevice ? "이미지 공유하기" : "클립보드 복사"}
            </KButton>
            {!isIosDevice && (
              <KButton
                width="full"
                size="lg"
                onClick={handleClickDownload}
                disabled={isExporting}
                className="h-[44px] gap-2 !text-white bg-neutral-700 hover:bg-neutral-600 rounded-3xl font-extrabold"
              >
                <Download size={18} />
                이미지 저장
              </KButton>
            )}
          </div>
        </div>
      </KDialogContent>
    </KDialog>
  );
}

export default memo(PremiumShareDialog);
