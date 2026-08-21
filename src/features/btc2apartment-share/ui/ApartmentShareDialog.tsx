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
import type { ApartmentYearPoint, LandmarkApartment } from "@/entities/apartment";
import { useBitcoinStore } from "@/entities/bitcoin";
import {
  captureElementToPngBlob,
  captureElementToPngDataUrl,
  clearCaptureOverlays,
  copyPngToClipboard,
  createPngFile,
  downloadImageFromDataUrl,
  isAndroid,
  isImageClipboardSupported,
  isImageFileShareSupported,
  isIos,
  isShareAbortedByUser,
  registerCaptureBackground,
  registerCaptureOverlay,
} from "@/shared/lib/imageExport";
import { useApartmentShareStore } from "../model/useApartmentShareStore";
import {
  APARTMENT_CARD_DESIGN_WIDTH,
  ApartmentShareCard,
  SHARE_QR_CANVAS_ID,
} from "./ApartmentShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-app-apartment.png";
const SHARE_TITLE = "ONLY-BTC.APP 아파트 비트코인 환산";

export interface ApartmentShareDialogProps {
  landmark: LandmarkApartment | undefined;
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
}

function ApartmentShareDialog({
  landmark,
  yearPoints,
  areaInSquareMeter,
}: ApartmentShareDialogProps) {
  // region [Hooks]
  const isOpen = useApartmentShareStore((state) => state.isOpen);
  const closeModal = useApartmentShareStore((state) => state.closeModal);
  const bitcoinPriceInKrw = useBitcoinStore((state) => state.bitcoinPrice.krw);

  const cardRef = useRef<HTMLDivElement>(null);
  const cardScaleAreaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const [scaledCardHeight, setScaledCardHeight] = useState<number>();
  const [isIosDevice, setIsIosDevice] = useState(false);
  // endregion

  // region [Privates]
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
    const displayScale = cardRect.width / APARTMENT_CARD_DESIGN_WIDTH;

    registerCaptureOverlay({
      src: qrCanvas.toDataURL(),
      size: qrRect.width / displayScale,
      top: (qrRect.top - cardRect.top) / displayScale,
      left: (qrRect.left - cardRect.left) / displayScale,
    });
  }, []);

  /**
   * 카드 고정 디자인 폭( 440px )을 현재 다이얼로그 폭에 맞춰 축소할 배율을 계산함.
   *
   * 축소는 `transform` 으로만 처리하므로 레이아웃 상 카드 크기는 그대로임.
   * 따라서 축소 상태에서 캡처해도 항상 동일한 해상도의 이미지가 만들어짐.
   * 다만 `transform` 은 주변 레이아웃을 밀어내지 못하므로 래퍼 높이를 직접 지정함.
   */
  const updateCardScale = useCallback(() => {
    const scaleArea = cardScaleAreaRef.current;
    const cardElement = cardRef.current;

    if (!scaleArea || !cardElement) {
      return;
    }

    const nextCardScale = Math.min(1, scaleArea.clientWidth / APARTMENT_CARD_DESIGN_WIDTH);

    setCardScale(nextCardScale);
    setScaledCardHeight(cardElement.offsetHeight * nextCardScale);
  }, []);

  /**
   * 축소 영역이 마운트되는 시점에 배율 계산과 크기 관찰을 시작함.
   *
   * Radix `DialogContent` 는 `Presence` 로 감싸여 있어 포털 내용이 이 컴포넌트보다 나중
   * 커밋에 마운트됨. `isOpen` 의존 `useEffect` 는 ref 가 `null` 인 채로 실행되고 다시
   * 실행되지 않으므로 콜백 ref 로 처리함.
   */
  const setCardScaleAreaRef = useCallback(
    (scaleArea: HTMLDivElement | null) => {
      cardScaleAreaRef.current = scaleArea;

      const cardElement = cardRef.current;

      if (!scaleArea || !cardElement) {
        return;
      }

      updateCardScale();

      const resizeObserver = new ResizeObserver(updateCardScale);

      resizeObserver.observe(scaleArea);
      resizeObserver.observe(cardElement);

      return () => {
        resizeObserver.disconnect();
        cardScaleAreaRef.current = null;
      };
    },
    [updateCardScale],
  );

  /**
   * 카드 이미지를 클립보드에 복사하고 성공 여부를 반환함.
   *
   * Safari 는 user gesture 동기 구간에서만 클립보드 쓰기를 허용하므로 Blob 을 await 하지 않음.
   * 같은 이유로 호출부에서도 이 함수 이전에 await 이 있으면 안 됨.
   */
  const copyCardImageToClipboard = async (cardElement: HTMLElement) => {
    try {
      await copyPngToClipboard(() => captureElementToPngBlob(cardElement));
      return true;
    } catch (error) {
      console.error("클립보드 복사 실패, 공유 시트로 폴백:", error);
      return false;
    }
  };

  /** 클립보드 이미지 쓰기를 지원하지 않거나 실패한 환경의 폴백. */
  const shareCardImageFile = async (cardElement: HTMLElement) => {
    const capturedImageBlob = await captureElementToPngBlob(cardElement);
    const shareImageFile = createPngFile(capturedImageBlob, SHARE_IMAGE_FILE_NAME);

    if (!isImageFileShareSupported(shareImageFile)) {
      kToast.info(isIosDevice ? "화면을 캡처해 주세요." : "이미지 저장을 이용해 주세요.");
      return;
    }

    await navigator.share({ files: [shareImageFile], title: SHARE_TITLE });
  };
  // endregion

  // region [Events]
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeModal();
      }
    },
    [closeModal],
  );

  const onClickCopyImage = async () => {
    const cardElement = cardRef.current;

    if (!cardElement || isExporting) {
      return;
    }

    setIsExporting(true);
    registerBackgroundFromCard();
    registerQrOverlayFromCard();

    try {
      // Android 는 clipboard.write 가 성공해도 실제로 저장되지 않는 경우가 있어 공유 시트를 우선함.
      // 단축 평가로 동기 구간에서 호출해 Safari 제스처 컨텍스트를 유지함.
      const isCopiedToClipboard =
        !isAndroid() &&
        isImageClipboardSupported() &&
        (await copyCardImageToClipboard(cardElement));

      if (isCopiedToClipboard) {
        kToast.success("클립보드에 복사되었습니다.");
        return;
      }

      await shareCardImageFile(cardElement);
    } catch (error) {
      if (isShareAbortedByUser(error)) {
        return;
      }

      console.error("이미지 복사 실패:", error);
      kToast.error("이미지 복사에 실패했습니다.");
    } finally {
      clearCaptureOverlays();
      setIsExporting(false);
    }
  };

  const onClickSaveImage = async () => {
    const cardElement = cardRef.current;

    if (!cardElement || isExporting) {
      return;
    }

    setIsExporting(true);
    registerBackgroundFromCard();
    registerQrOverlayFromCard();

    try {
      const dataUrl = await captureElementToPngDataUrl(cardElement);

      downloadImageFromDataUrl(dataUrl, SHARE_IMAGE_FILE_NAME);
    } catch (error) {
      console.error("이미지 저장 실패:", error);
      kToast.error("이미지 저장에 실패했습니다.");
    } finally {
      clearCaptureOverlays();
      setIsExporting(false);
    }
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setIsIosDevice(isIos());
  }, []);
  // endregion

  return (
    <KDialog open={isOpen} onOpenChange={onOpenChange} blur={3} size="md">
      <KDialogOverlay className="bg-black/70 backdrop-blur-md" />
      {/*
        급등 알림 카드와 **시작 위치**를 맞춘 값임.
        두 다이얼로그 모두 중앙 기준으로 앉는데 이 카드가 81px 더 높아,
        같은 42% 를 쓰면 위로 그만큼 더 올라가 서로 다른 자리에서 시작함.
      */}
      <KDialogContent className="p-0 border-none bg-transparent shadow-none max-w-[460px] w-[92vw] [&>button]:hidden">
        <KDialogHeader className="sr-only">
          <KDialogTitle>아파트 비트코인 환산 카드</KDialogTitle>
          <KDialogDescription>
            SNS 캡처 및 공유용 아파트 실거래가 비트코인 환산 카드입니다.
          </KDialogDescription>
        </KDialogHeader>

        <div className="flex flex-col items-center w-full min-w-0">
          <div className="w-full flex justify-end mb-3">
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer backdrop-blur-sm border border-neutral-700/50 flex-shrink-0"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={setCardScaleAreaRef} className="w-full flex justify-center">
            <div
              className="overflow-hidden"
              style={{
                width: APARTMENT_CARD_DESIGN_WIDTH * cardScale,
                height: scaledCardHeight,
              }}
            >
              <div
                style={{
                  width: APARTMENT_CARD_DESIGN_WIDTH,
                  transform: `scale(${cardScale})`,
                  transformOrigin: "top left",
                }}
              >
                <ApartmentShareCard
                  cardRef={cardRef}
                  landmark={landmark}
                  yearPoints={yearPoints}
                  areaInSquareMeter={areaInSquareMeter}
                  bitcoinPriceInKrw={bitcoinPriceInKrw}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 w-full max-w-[440px]">
            <KButton
              width="full"
              size="lg"
              onClick={onClickCopyImage}
              disabled={isExporting}
              className="h-[44px] gap-2 !text-white bg-bitcoin rounded-3xl"
            >
              <Copy size={18} />
              {isExporting ? "처리 중..." : "이미지 복사"}
            </KButton>
            {!isIosDevice && (
              <KButton
                width="full"
                size="lg"
                onClick={onClickSaveImage}
                disabled={isExporting}
                className="h-[44px] gap-2 !text-white bg-neutral-700 hover:bg-neutral-600 rounded-3xl"
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

const MemoizedApartmentShareDialog = memo(ApartmentShareDialog);
MemoizedApartmentShareDialog.displayName = "ApartmentShareDialog";

export { MemoizedApartmentShareDialog as ApartmentShareDialog };
export default MemoizedApartmentShareDialog;
