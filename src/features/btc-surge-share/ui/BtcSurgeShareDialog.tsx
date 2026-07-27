"use client";

import { toBlob, toPng } from "html-to-image";
import {
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
  kToast,
} from "kku-ui";
import { Download, Share2, X } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { BtcSurgeShareCard } from "./BtcSurgeShareCard";

function BtcSurgeShareDialog() {
  // region [Hooks]
  const isOpen = useBtcSurgeShareStore((state) => state.isOpen);
  const closeModal = useBtcSurgeShareStore((state) => state.closeModal);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  // endregion


  // region [Privates]
  const captureCardToPng = async () => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      style: { transform: "scale(1)", transformOrigin: "top left" },
    });
  };

  const captureCardToBlob = async () => {
    if (!cardRef.current) return null;
    return toBlob(cardRef.current, { cacheBust: true, pixelRatio: 3 });
  };

  const downloadDataUrl = (dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `ONLY-BTC-APP-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  // endregion


  // region [Events]
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeModal();
    },
    [closeModal],
  );

  const onClickDownloadImage = async () => {
    if (!cardRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const dataUrl = await captureCardToPng();
      if (!dataUrl) throw new Error("PNG 변환 실패");
      downloadDataUrl(dataUrl);
      kToast.success("이미지가 저장되었습니다!");
    } catch (err) {
      console.error("이미지 저장 실패:", err);
      kToast.error("이미지 저장에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const onClickShareImage = async () => {
    if (!cardRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const blob = await captureCardToBlob();
      if (!blob) throw new Error("Blob 생성 실패");

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        kToast.success("클립보드에 카드가 복사되었습니다! SNS에 붙여넣어 공유해보세요.");
      } else if (navigator.share) {
        const file = new File([blob], "only-btc-app.png", { type: "image/png" });
        await navigator.share({ files: [file], title: "ONLY-BTC.APP 비트코인 시세 알림" });
      } else {
        kToast.info("이미지 저장을 이용해 주세요.");
      }
    } catch (err) {
      console.error("이미지 공유 실패:", err);
      kToast.error("공유에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };
  // endregion


  return (
    <KDialog open={isOpen} onOpenChange={onOpenChange} blur={3} size="md">
      <KDialogOverlay className="bg-black/70 backdrop-blur-md" />
      <KDialogContent className="p-0 border-none bg-transparent shadow-none max-w-[460px] w-[92vw] [&>button]:hidden">
        <KDialogHeader className="sr-only">
          <KDialogTitle>비트코인 급등 알림 카드</KDialogTitle>
          <KDialogDescription>
            SNS 캡처 및 공유용 비트코인 실시간 급등 알림 카드입니다.
          </KDialogDescription>
        </KDialogHeader>

        <div className="flex flex-col items-center">
          {/* 다이얼로그 닫기 버튼 */}
          <div className="w-full flex justify-end mb-2">
            <button
              type="button"
              onClick={closeModal}
              className="p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer backdrop-blur-sm border border-neutral-700/50 flex-shrink-0"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {/* SNS 캡처 대상 카키/다크 에메랄드 카드 */}
          <div className="w-full flex justify-center">
            <BtcSurgeShareCard cardRef={cardRef} />
          </div>

          {/* 캡처 & 공유 액션 버튼 그룹 */}
          <div className="flex items-center gap-3 mt-4 w-full max-w-[440px]">
            <button
              type="button"
              onClick={onClickDownloadImage}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(0,230,118,0.4)] cursor-pointer disabled:opacity-50"
            >
              <Download size={18} />
              {isExporting ? "저장 중..." : "이미지 저장"}
            </button>

            <button
              type="button"
              onClick={onClickShareImage}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700/80 active:scale-[0.98] text-white font-extrabold text-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Share2 size={18} />
              이미지 복사
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
