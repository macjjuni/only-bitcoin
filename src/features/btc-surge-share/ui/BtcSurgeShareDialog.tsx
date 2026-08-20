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
import { BITCOIN_COLOR } from "@/shared/config/color";
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
  registerCaptureOverlay,
} from "@/shared/lib/imageExport";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { useShareCardChart } from "../model/useShareCardChart";
import {
  BTC_SURGE_CARD_DESIGN_WIDTH,
  BtcSurgeShareCard,
  COIN_OVERLAY_BASE,
} from "./BtcSurgeShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-app.png";
const SHARE_TITLE = "ONLY-BTC.APP 비트코인 시세 알림";

function BtcSurgeShareDialog() {
  // region [Hooks]
  const isOpen = useBtcSurgeShareStore((state) => state.isOpen);
  const closeModal = useBtcSurgeShareStore((state) => state.closeModal);
  // 카드와 동일한 쿼리를 구독한다. queryKey 를 공유하므로 추가 요청은 발생하지 않는다.
  // 이 컴포넌트는 모든 페이지에 상시 마운트되므로 열려 있을 때만 구독한다.
  const { isChartDataReady } = useShareCardChart(isOpen);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardScaleAreaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const [scaledCardHeight, setScaledCardHeight] = useState<number>();
  const [isIosDevice, setIsIosDevice] = useState(false);
  // endregion

  // region [Privates]
  /** 캡처 직전 카드 DOM에서 themeColor를 읽어 오버레이를 등록한다. */
  const registerOverlayFromCard = useCallback(() => {
    const themeColor = cardRef.current?.dataset.themeColor ?? BITCOIN_COLOR;
    registerCaptureOverlay({
      ...COIN_OVERLAY_BASE,
      shadowColor: `${themeColor}80`,
    });
  }, []);

  /**
   * 카드 고정 디자인 폭( 440px )을 현재 다이얼로그 폭에 맞춰 축소할 배율을 계산한다.
   *
   * 축소는 `transform` 으로만 처리하므로 레이아웃 상 카드 크기는 그대로다.
   * 따라서 축소 상태에서 캡처해도 항상 동일한 해상도의 이미지가 만들어진다.
   * 다만 `transform` 은 주변 레이아웃을 밀어내지 못하므로, 축소된 만큼 래퍼 높이를 직접 지정한다.
   */
  const updateCardScale = useCallback(() => {
    const scaleArea = cardScaleAreaRef.current;
    const cardElement = cardRef.current;

    if (!scaleArea || !cardElement) {
      return;
    }

    const nextCardScale = Math.min(1, scaleArea.clientWidth / BTC_SURGE_CARD_DESIGN_WIDTH);

    setCardScale(nextCardScale);
    setScaledCardHeight(cardElement.offsetHeight * nextCardScale);
  }, []);

  /**
   * 축소 영역이 마운트되는 시점에 배율 계산과 크기 관찰을 시작한다.
   *
   * Radix `DialogContent` 는 `Presence` 로 감싸여 있어 포털 내용이 이 컴포넌트보다 나중 커밋에
   * 마운트된다. 따라서 `isOpen` 을 의존성으로 둔 `useEffect` 는 ref 가 아직 `null` 인 상태로 실행되고
   * 이후 다시 실행되지 않는다. 렌더 타이밍과 무관하게 동작하도록 콜백 ref 로 처리한다.
   * ( 자식의 ref 가 부모보다 먼저 연결되므로 이 시점에 `cardRef` 는 이미 채워져 있다 )
   */
  const setCardScaleAreaRef = useCallback(
    (scaleArea: HTMLDivElement | null) => {
      cardScaleAreaRef.current = scaleArea;

      const cardElement = cardRef.current;

      if (!scaleArea || !cardElement) {
        return;
      }

      updateCardScale();

      // 다이얼로그 폭 변화와 카드 높이 변화( 데이터 로딩 · 타임프레임 전환 )를 모두 관찰한다.
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
   * 카드 이미지를 클립보드에 복사하고 성공 여부를 반환한다.
   *
   * Safari 는 user gesture 동기 구간에서만 클립보드 쓰기를 허용하므로 Blob 을 await 하지 않는다.
   * 같은 이유로 호출부에서도 이 함수 이전에 await 이 있으면 안 된다.
   * ( async 함수 본문은 첫 await 까지 동기 실행되므로 `copyPngToClipboard` 호출 자체는 제스처 구간에 남는다 )
   *
   * 제스처 만료 · 권한 거부로 실패해도 예외를 올리지 않고 `false` 를 반환해 공유 시트 폴백으로 넘긴다.
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

  /**
   * 클립보드 이미지 쓰기를 지원하지 않거나 실패한 환경의 폴백. 네이티브 공유 시트로 카드를 내보낸다.
   */
  const shareCardImageFile = async (cardElement: HTMLElement) => {
    const capturedImageBlob = await captureElementToPngBlob(cardElement);
    const shareImageFile = createPngFile(capturedImageBlob, SHARE_IMAGE_FILE_NAME);

    if (!isImageFileShareSupported(shareImageFile)) {
      // iOS 는 "이미지 저장" 버튼을 숨기므로 남는 경로가 없다. 다른 문구로 안내한다.
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

    if (!cardElement || isExporting || !isChartDataReady) {
      return;
    }

    setIsExporting(true);
    registerOverlayFromCard();

    try {
      // Android 는 clipboard.write 가 성공으로 응답해도 실제로 이미지가 저장되지 않는 경우가 있어 공유 시트를 우선한다.
      // 단축 평가로 `copyCardImageToClipboard` 를 동기 구간에서 호출해 Safari 제스처 컨텍스트를 유지한다.
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

    if (!cardElement || isExporting || !isChartDataReady) {
      return;
    }

    setIsExporting(true);
    registerOverlayFromCard();

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

  // endregion

  // region [Templates]
  /** 시계열이 없으면 라벨과 수치가 어긋난 카드가 만들어지므로 내보내기를 막는다. */
  const isExportDisabled = isExporting || !isChartDataReady;
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setIsIosDevice(isIos());
  }, []);

  // endregion

  return (
    <KDialog open={isOpen} onOpenChange={onOpenChange} blur={3} size="md">
      <KDialogOverlay className="bg-black/70 backdrop-blur-md" />
      <KDialogContent className="!top-[42%] p-0 border-none bg-transparent shadow-none max-w-[460px] w-[92vw] [&>button]:hidden">
        <KDialogHeader className="sr-only">
          <KDialogTitle>비트코인 급등 알림 카드</KDialogTitle>
          <KDialogDescription>
            SNS 캡처 및 공유용 비트코인 실시간 급등 알림 카드입니다.
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
                width: BTC_SURGE_CARD_DESIGN_WIDTH * cardScale,
                height: scaledCardHeight,
              }}
            >
              <div
                style={{
                  width: BTC_SURGE_CARD_DESIGN_WIDTH,
                  transform: `scale(${cardScale})`,
                  transformOrigin: "top left",
                }}
              >
                <BtcSurgeShareCard cardRef={cardRef} />
              </div>
            </div>
          </div>

          {/* 캡처 & 공유 액션 버튼 그룹 */}
          <div className="flex items-center gap-2 mt-4 w-full max-w-[440px]">
            <KButton
              width="full"
              size="lg"
              onClick={onClickCopyImage}
              disabled={isExportDisabled}
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
                disabled={isExportDisabled}
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

const MemoizedBtcSurgeShareDialog = memo(BtcSurgeShareDialog);
MemoizedBtcSurgeShareDialog.displayName = "BtcSurgeShareDialog";

export { MemoizedBtcSurgeShareDialog as BtcSurgeShareDialog };
export default MemoizedBtcSurgeShareDialog;
