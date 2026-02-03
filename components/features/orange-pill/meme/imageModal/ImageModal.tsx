'use client';

import { memo, useCallback, useEffect, MouseEvent } from "react";

interface ImageModalProps {
  src: string;
  onClose: () => void;
}

const ImageModal = ({ src, onClose }: ImageModalProps) => {

  // region [Privates]
  const downloadImage = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = src.split('/').pop() || 'image.webp';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [src]);
  // endregion


  // region [Events]
  const onClickBackdrop = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const onClickDownload = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    downloadImage();
  }, [downloadImage]);

  const onClickClose = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Download Button */}
      <button
        type="button"
        onClick={onClickDownload}
        className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 z-10"
        aria-label="다운로드"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </button>

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in duration-300">
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
