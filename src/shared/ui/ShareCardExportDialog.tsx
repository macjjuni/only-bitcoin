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
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  captureElementToPngBlob,
  captureElementToPngDataUrl,
  copyPngToClipboard,
  createPngFile,
  downloadImageFromDataUrl,
  type ImageCaptureOptions,
  isAndroid,
  isImageClipboardSupported,
  isImageFileShareSupported,
  isIos,
  isShareAbortedByUser,
} from "@/shared/lib/imageExport";

export interface ShareCardExportDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  cardDesignWidthInPixels: number;
  imageFileName: string;
  shareTitle: string;
  renderCard: (cardReference: RefObject<HTMLDivElement | null>) => ReactNode;
  onClose: () => void;
  createCaptureOptions?: (cardElement: HTMLDivElement) => ImageCaptureOptions;
  isExportReady?: boolean;
  contentTopClassName?: string;
  closeButtonRowClassName?: string;
  actionButtonClassName?: string;
  shouldNotifyDownloadSuccess?: boolean;
}

export default function ShareCardExportDialog({
  isOpen,
  title,
  description,
  cardDesignWidthInPixels,
  imageFileName,
  shareTitle,
  renderCard,
  onClose,
  createCaptureOptions,
  isExportReady = true,
  contentTopClassName = "!top-[45%]",
  closeButtonRowClassName = "mb-3",
  actionButtonClassName,
  shouldNotifyDownloadSuccess = false,
}: ShareCardExportDialogProps) {
  // region [Hooks]
  const cardReference = useRef<HTMLDivElement>(null);
  const cardScaleAreaReference = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const [scaledCardHeightInPixels, setScaledCardHeightInPixels] = useState<number>();
  const [isIosDevice, setIsIosDevice] = useState(false);
  // endregion

  // region [Privates]
  const resolveImageCaptureOptions = (cardElement: HTMLDivElement): ImageCaptureOptions => {
    return createCaptureOptions?.(cardElement) ?? {};
  };

  /**
   * 고정 폭 카드를 현재 다이얼로그 폭에 맞게 축소하되 캡처 해상도는 원본 크기로 유지한다.
   */
  const updateCardScale = useCallback((): void => {
    const scaleAreaElement = cardScaleAreaReference.current;
    const cardElement = cardReference.current;

    if (!scaleAreaElement || !cardElement) {
      return;
    }

    const nextCardScale = Math.min(1, scaleAreaElement.clientWidth / cardDesignWidthInPixels);

    setCardScale(nextCardScale);
    setScaledCardHeightInPixels(cardElement.offsetHeight * nextCardScale);
  }, [cardDesignWidthInPixels]);

  /**
   * 다이얼로그 포털이 실제로 마운트된 시점부터 카드 폭과 높이 변화를 관찰한다.
   */
  const setCardScaleAreaReference = useCallback(
    (scaleAreaElement: HTMLDivElement | null) => {
      cardScaleAreaReference.current = scaleAreaElement;
      const cardElement = cardReference.current;

      if (!scaleAreaElement || !cardElement) {
        return;
      }

      updateCardScale();

      const resizeObserver = new ResizeObserver(updateCardScale);
      resizeObserver.observe(scaleAreaElement);
      resizeObserver.observe(cardElement);

      return () => {
        resizeObserver.disconnect();
        cardScaleAreaReference.current = null;
      };
    },
    [updateCardScale],
  );

  /** Safari의 user gesture 구간을 유지하면서 클립보드 복사를 시도한다. */
  const copyCardImageToClipboard = async (
    cardElement: HTMLDivElement,
    imageCaptureOptions: ImageCaptureOptions,
  ): Promise<boolean> => {
    try {
      await copyPngToClipboard(() => captureElementToPngBlob(cardElement, imageCaptureOptions));
      return true;
    } catch (error) {
      console.error("클립보드 복사 실패, 공유 시트로 폴백:", error);
      return false;
    }
  };

  const shareCardImageFile = async (
    cardElement: HTMLDivElement,
    imageCaptureOptions: ImageCaptureOptions,
  ): Promise<void> => {
    const capturedImageBlob = await captureElementToPngBlob(cardElement, imageCaptureOptions);
    const shareImageFile = createPngFile(capturedImageBlob, imageFileName);

    if (!isImageFileShareSupported(shareImageFile)) {
      kToast.info(isIosDevice ? "화면을 캡처해 주세요." : "이미지 저장을 이용해 주세요.");
      return;
    }

    await navigator.share({ files: [shareImageFile], title: shareTitle });
  };
  // endregion

  // region [Events]
  const onOpenChangeDialog = (nextIsOpen: boolean): void => {
    if (!nextIsOpen) {
      onClose();
    }
  };

  const onClickCloseButton = (): void => {
    onClose();
  };

  const onClickCopyImageButton = async (): Promise<void> => {
    const cardElement = cardReference.current;

    if (!cardElement || isExporting || !isExportReady) {
      return;
    }

    setIsExporting(true);
    const imageCaptureOptions = resolveImageCaptureOptions(cardElement);

    try {
      const isCopiedToClipboard =
        !isAndroid() &&
        isImageClipboardSupported() &&
        (await copyCardImageToClipboard(cardElement, imageCaptureOptions));

      if (isCopiedToClipboard) {
        kToast.success("클립보드에 복사되었습니다.");
        return;
      }

      await shareCardImageFile(cardElement, imageCaptureOptions);
    } catch (error) {
      if (isShareAbortedByUser(error)) {
        return;
      }

      console.error("이미지 복사 실패:", error);
      kToast.error("이미지 복사에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const onClickSaveImageButton = async (): Promise<void> => {
    const cardElement = cardReference.current;

    if (!cardElement || isExporting || !isExportReady) {
      return;
    }

    setIsExporting(true);
    const imageCaptureOptions = resolveImageCaptureOptions(cardElement);

    try {
      const imageDataUrl = await captureElementToPngDataUrl(cardElement, imageCaptureOptions);
      downloadImageFromDataUrl(imageDataUrl, imageFileName);

      if (shouldNotifyDownloadSuccess) {
        kToast.success("이미지가 다운로드되었습니다.");
      }
    } catch (error) {
      console.error("이미지 저장 실패:", error);
      kToast.error("이미지 저장에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setIsIosDevice(isIos());
  }, []);
  // endregion

  // region [Templates]
  const isExportDisabled = isExporting || !isExportReady;
  const CardTemplate = renderCard(cardReference);
  const dialogContentClassName = [
    "fixed left-1/2 z-50 w-[92vw] max-w-[460px] -translate-x-1/2 -translate-y-1/2 border-none bg-transparent p-0 shadow-none outline-none [&>button]:hidden",
    contentTopClassName,
  ].join(" ");
  const closeButtonContainerClassName = ["flex w-full justify-end", closeButtonRowClassName].join(
    " ",
  );
  const copyButtonClassName = [
    "h-[44px] gap-2 rounded-3xl bg-bitcoin !text-white",
    actionButtonClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const saveButtonClassName = [
    "h-[44px] gap-2 rounded-3xl bg-neutral-700 !text-white hover:bg-neutral-600",
    actionButtonClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const cardViewportStyle = {
    width: cardDesignWidthInPixels * cardScale,
    height: scaledCardHeightInPixels,
  };
  const cardTransformStyle = {
    width: cardDesignWidthInPixels,
    transform: `scale(${cardScale})`,
    transformOrigin: "top left",
  };
  // endregion

  if (!isOpen) {
    return null;
  }

  return (
    <KDialog open={isOpen} onOpenChange={onOpenChangeDialog} blur={3} size="md">
      <KDialogOverlay className="z-50 bg-black/70 backdrop-blur-md" />
      <KDialogContent className={dialogContentClassName}>
        <KDialogHeader className="sr-only">
          <KDialogTitle>{title}</KDialogTitle>
          <KDialogDescription>{description}</KDialogDescription>
        </KDialogHeader>

        <div className="flex w-full min-w-0 flex-col items-center">
          <div className={closeButtonContainerClassName}>
            <button
              type="button"
              onClick={onClickCloseButton}
              className="flex-shrink-0 cursor-pointer rounded-full border border-neutral-700/50 bg-neutral-800/80 p-2 text-neutral-300 backdrop-blur-sm transition-colors hover:bg-neutral-700"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={setCardScaleAreaReference} className="flex w-full justify-center">
            <div className="overflow-hidden rounded-[32px]" style={cardViewportStyle}>
              <div style={cardTransformStyle}>{CardTemplate}</div>
            </div>
          </div>

          <div className="mt-4 flex w-full max-w-[440px] items-center gap-2">
            <KButton
              width="full"
              size="lg"
              onClick={onClickCopyImageButton}
              disabled={isExportDisabled}
              className={copyButtonClassName}
            >
              <Copy size={18} />
              {isExporting ? "처리 중..." : "이미지 복사"}
            </KButton>
            {!isIosDevice && (
              <KButton
                width="full"
                size="lg"
                onClick={onClickSaveImageButton}
                disabled={isExportDisabled}
                className={saveButtonClassName}
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
