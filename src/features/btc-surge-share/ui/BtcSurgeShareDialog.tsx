"use client";

import {
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
  kToast,
} from "kku-ui";
import { Copy, X } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import {
  captureElementToPngBlob,
  copyPngToClipboard,
  createPngFile,
  isImageClipboardSupported,
  isImageFileShareSupported,
  isShareAbortedByUser,
} from "@/shared/lib/imageExport";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { BTC_SURGE_CARD_DESIGN_WIDTH, BtcSurgeShareCard } from "./BtcSurgeShareCard";

const SHARE_IMAGE_FILE_NAME = "only-btc-app.png";
const SHARE_TITLE = "ONLY-BTC.APP 비트코인 시세 알림";

function BtcSurgeShareDialog() {
  // region [Hooks]
  const isOpen = useBtcSurgeShareStore((state) => state.isOpen);
  const closeModal = useBtcSurgeShareStore((state) => state.closeModal);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardScaleAreaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const [scaledCardHeight, setScaledCardHeight] = useState<number>();
  // endregion

  // region [Privates]
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
   * 클립보드 이미지 쓰기를 지원하지 않는 환경의 폴백. 네이티브 공유 시트로 카드를 내보낸다.
   */
  const shareCardImageFile = async (cardElement: HTMLElement) => {
    const capturedImageBlob = await captureElementToPngBlob(cardElement);
    const shareImageFile = createPngFile(capturedImageBlob, SHARE_IMAGE_FILE_NAME);

    if (!isImageFileShareSupported(shareImageFile)) {
      kToast.info("이미지 복사를 이용해 주세요.");
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

    try {
      if (isImageClipboardSupported()) {
        // Safari 는 user gesture 동기 구간에서만 클립보드 쓰기를 허용하므로 Blob 을 await 하지 않는다.
        await copyPngToClipboard(() => captureElementToPngBlob(cardElement));
        kToast.success("클립보드에 복사되었습니다.");
        return;
      }

      await shareCardImageFile(cardElement);
    } catch (error) {
      if (isShareAbortedByUser(error)) {
        return;
      }

      console.error("이미지 공유 실패:", error);
      kToast.error("공유에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };
  // endregion

  return (
    <KDialog open={isOpen} onOpenChange={onOpenChange} blur={3} size="md">
      <KDialogOverlay className="bg-black/70 backdrop-blur-md" />
      <KDialogContent className="!top-[44%] p-0 border-none bg-transparent shadow-none max-w-[460px] w-[92vw] [&>button]:hidden">
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
          <div className="flex items-center mt-4 w-full max-w-[440px]">
            <button
              type="button"
              onClick={onClickCopyImage}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(0,230,118,0.4)] cursor-pointer"
            >
              <Copy size={18} />
              {isExporting ? "처리 중..." : "이미지 복사"}
            </button>
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
