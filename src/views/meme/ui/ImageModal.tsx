"use client";

import { Copy, Download, X } from "lucide-react";
import { type MouseEvent, memo, useCallback, useEffect } from "react";
import { copyMemeImageToClipboard, downloadMemeImage } from "@/features/download-meme";

interface ImageModalProps {
  src: string;
  onClose: () => void;
}

const ImageModal = ({ src, onClose }: ImageModalProps) => {
  // region [Events]
  const onClickBackdrop = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const onClickDownload = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      downloadMemeImage(src);
    },
    [src],
  );

  const onClickCopy = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      copyMemeImageToClipboard(src);
    },
    [src],
  );

  const onClickClose = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClose();
    },
    [onClose],
  );
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);
  // endregion

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClickBackdrop}
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={onClickClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 z-10"
        aria-label="닫기"
      >
        <X className="size-6 p-0.5" aria-hidden="true" />
      </button>

      {/* Copy Button */}
      <button
        type="button"
        onClick={onClickCopy}
        className="absolute top-4 right-28 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 z-10"
        aria-label="복사"
      >
        <Copy className="size-6 p-0.5" aria-hidden="true" />
      </button>

      {/* Download Button */}
      <button
        type="button"
        onClick={onClickDownload}
        className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 z-10"
        aria-label="다운로드"
      >
        <Download className="size-6 p-0.5" aria-hidden="true" />
      </button>

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in duration-300">
        {/* biome-ignore lint/performance/noImgElement: 외부 밈 이미지 원본 확대 뷰. 크기를 알 수 없고 object-contain 으로 원본을 그대로 보여준다 */}
        <img
          src={src}
          alt="확대 이미지"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};

const MemoizedImageModal = memo(ImageModal);
MemoizedImageModal.displayName = "ImageModal";

export default MemoizedImageModal;
