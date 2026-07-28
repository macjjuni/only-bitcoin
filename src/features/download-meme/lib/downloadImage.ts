import { kToast } from "kku-ui";
import { copyPngToClipboard, isImageClipboardSupported, isIos } from "@/shared/lib/imageExport";

export const downloadMemeImage = async (src: string) => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = src.split("/").pop() || "image.webp";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    if (isIos()) {
      kToast.info(
        "iOS 환경에서는 다운로드가 안될 경우 이미지를 길게 눌러 사진 앱에 저장해 주세요.",
      );
    } else {
      kToast.success("이미지가 저장되었습니다!");
    }
  } catch (error) {
    console.error("Download failed:", error);
    if (isIos()) {
      kToast.info("이미지를 길게 눌러 사진 앱에 저장해 주세요.");
    } else {
      kToast.error("이미지 다운로드에 실패했습니다.");
    }
  }
};

export const copyMemeImageToClipboard = async (src: string) => {
  try {
    const fetchImageBlob = async (): Promise<Blob> => {
      const response = await fetch(src);
      const blob = await response.blob();
      if (blob.type === "image/png") {
        return blob;
      }
      // png가 아닌 경우(webp, jpg 등) canvas를 거쳐 png blob으로 변환
      return new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context is null"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((convertedBlob) => {
            if (convertedBlob) {
              resolve(convertedBlob);
            } else {
              reject(new Error("Canvas toBlob failed"));
            }
          }, "image/png");
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = src;
      });
    };

    if (isImageClipboardSupported()) {
      await copyPngToClipboard(fetchImageBlob);
      kToast.success("클립보드에 이미지가 복사되었습니다.");
    } else {
      kToast.info("이미지를 길게 눌러 복사해 주세요.");
    }
  } catch (error) {
    console.error("Copy image failed:", error);
    kToast.error("클립보드 복사에 실패했습니다.");
  }
};
