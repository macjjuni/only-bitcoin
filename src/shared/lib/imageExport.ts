"use client";

import { toBlob, toPng } from "html-to-image";

const PNG_MIME_TYPE = "image/png";

/** SNS 업로드 시 선명도를 확보하기 위한 캡처 해상도 배율 */
const CAPTURE_PIXEL_RATIO = 3;

/**
 * 캡처 복제본의 루트에 강제로 덮어쓰는 스타일.
 *
 * `html-to-image` 는 대상의 계산된 스타일을 그대로 복제본에 복사한 뒤 `clientWidth` 크기의
 * `foreignObject` 안에 넣는다. 이때 `margin: 0 auto` 같은 중앙 정렬 여백이 레이아웃이 해석한
 * used value( 예: 10px )로 복사되어 복제본이 캔버스 안에서 오른쪽으로 밀리고,
 * 결과 이미지에 좌측 공백과 우측 잘림이 생긴다. 캔버스에는 대상 박스만 그리면 되므로
 * 여백과 변형을 모두 초기화한다.
 */
const CAPTURE_ROOT_STYLE = {
  margin: "0",
  transform: "scale(1)",
  transformOrigin: "top left",
  borderRadius: "0",
} as const;

const CAPTURE_OPTIONS = {
  cacheBust: true,
  pixelRatio: CAPTURE_PIXEL_RATIO,
  style: CAPTURE_ROOT_STYLE,
} as const;

/**
 * iOS 기기(iPhone, iPad, iPod) 환경인지 여부를 반환한다.
 */
export function isIos(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Android 기기 환경인지 여부를 반환한다.
 */
export function isAndroid(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android/i.test(navigator.userAgent);
}

/**
 * 클립보드 이미지 쓰기(ClipboardItem) 지원 여부를 반환한다.
 */
export function isImageClipboardSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    typeof window.ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function"
  );
}

/**
 * 파일 첨부 방식의 네이티브 공유 시트 지원 여부를 반환한다.
 *
 * `navigator.share` 존재만 확인하면 파일 공유를 지원하지 않는 데스크톱 브라우저에서
 * 호출 시점에 예외가 발생하므로, 반드시 `canShare` 로 파일 첨부 가능 여부까지 확인한다.
 */
export function isImageFileShareSupported(imageFile: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare !== "function") {
    return false;
  }

  return navigator.canShare({ files: [imageFile] });
}

/** Safari 재시도 설정 */
const RETRY_MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 300;
const RETRY_MIN_BLOB_SIZE = 500_000;

/**
 * DOM 엘리먼트를 PNG Data URL 로 캡처한다.
 *
 * Safari 이미지 로딩 지연 대응을 위해 빈 결과일 경우 재시도한다.
 */
export async function captureElementToPngDataUrl(element: HTMLElement): Promise<string> {
  const EMPTY_DATA_URL_THRESHOLD = 1000;

  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    const dataUrl = await toPng(element, CAPTURE_OPTIONS);

    if (dataUrl && dataUrl.length > EMPTY_DATA_URL_THRESHOLD) {
      return dataUrl;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  return toPng(element, CAPTURE_OPTIONS);
}

/**
 * DOM 엘리먼트를 PNG Blob 으로 캡처한다.
 *
 * Safari 는 이미지 로딩을 지연시켜 첫 시도에서 이미지가 누락될 수 있다.
 * Blob 크기가 임계값 미만이면 재시도하여 모든 리소스가 포함된 결과를 보장한다.
 */
export async function captureElementToPngBlob(element: HTMLElement): Promise<Blob> {
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    blob = await toBlob(element, CAPTURE_OPTIONS);

    if (blob && blob.size > RETRY_MIN_BLOB_SIZE) {
      return blob;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  if (!blob) {
    throw new Error("이미지 Blob 생성에 실패했습니다.");
  }

  return blob;
}

/**
 * Data URL 이미지를 파일로 내려받는다.
 */
export function downloadImageFromDataUrl(dataUrl: string, fileName: string): void {
  const downloadLinkElement = document.createElement("a");

  downloadLinkElement.href = dataUrl;
  downloadLinkElement.download = fileName;

  document.body.appendChild(downloadLinkElement);
  downloadLinkElement.click();
  downloadLinkElement.remove();
}

/**
 * PNG 이미지를 클립보드에 복사한다.
 *
 * Safari 는 `ClipboardItem` 이 **user gesture 동기 구간**에서 생성될 때만 쓰기를 허용한다.
 * Blob 을 `await` 로 먼저 받아버리면 제스처 컨텍스트가 만료되어 `NotAllowedError` 가 발생하므로,
 * Blob 생성 Promise 를 그대로 `ClipboardItem` 에 넘긴다.
 * 같은 이유로 이 함수는 의도적으로 `async` 가 아니며, 호출부에서도 `await` 이전에 호출해야 한다.
 */
export function copyPngToClipboard(createPngBlob: () => Promise<Blob>): Promise<void> {
  const clipboardItem = new ClipboardItem({ [PNG_MIME_TYPE]: createPngBlob() });

  return navigator.clipboard.write([clipboardItem]);
}

/**
 * 공유 시트 첨부용 PNG File 객체를 생성한다.
 */
export function createPngFile(imageBlob: Blob, fileName: string): File {
  return new File([imageBlob], fileName, { type: PNG_MIME_TYPE });
}

/**
 * 사용자가 공유 시트를 직접 닫아 발생한 취소인지 판별한다. ( 에러 토스트 노출 방지용 )
 */
export function isShareAbortedByUser(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

