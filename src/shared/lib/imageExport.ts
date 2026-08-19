"use client";

import { toCanvas } from "html-to-image";

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

/** data-capture-ignore 속성이 있는 노드를 캡처에서 제외한다. */
function captureFilter(node: Element): boolean {
  if (node instanceof HTMLElement && node.dataset.captureIgnore !== undefined) {
    return false;
  }
  return true;
}

const CAPTURE_OPTIONS = {
  cacheBust: true,
  pixelRatio: CAPTURE_PIXEL_RATIO,
  style: CAPTURE_ROOT_STYLE,
  filter: captureFilter,
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

// region [Overlay Composite]

export interface OverlayImageInfo {
  src: string;
  size: number;
  top: number;
  right: number;
  shadowColor?: string;
  shadowBlur?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 캡처된 canvas 위에 오버레이 이미지를 직접 합성한다.
 * Safari foreignObject 이미지 렌더링 제약을 완전히 우회한다.
 */
async function compositeOverlay(
  canvas: HTMLCanvasElement,
  overlay: OverlayImageInfo,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const overlayImg = await loadImage(overlay.src);
  const scaledSize = overlay.size * CAPTURE_PIXEL_RATIO;
  const x = canvas.width - overlay.right * CAPTURE_PIXEL_RATIO - scaledSize;
  const y = overlay.top * CAPTURE_PIXEL_RATIO;

  if (overlay.shadowColor) {
    ctx.shadowColor = overlay.shadowColor;
    ctx.shadowBlur = (overlay.shadowBlur ?? 20) * CAPTURE_PIXEL_RATIO;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.drawImage(overlayImg, x, y, scaledSize, scaledSize);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

/**
 * 캡처된 canvas **아래**에 배경 이미지를 깐다.
 *
 * `destination-over` 는 이미 그려진 픽셀을 건드리지 않고 투명한 곳만 채운다.
 * 따라서 카드 루트에 불투명 배경색이 없어야 하고, 사진 위 어둡게 까는 그라데이션은
 * 반투명이어야 한다. ( 그래야 알파 합성으로 "사진 위 그라데이션" 이 재현된다 )
 *
 * `<img>` 를 그대로 캡처하지 않는 이유는 코인 오버레이와 같다 — Safari 는
 * foreignObject 안의 이미지를 그리지 못하는 경우가 있는데, 배경 사진은 이 카드의
 * 전부라 실패하면 카드가 통째로 빈 그림이 된다.
 */
async function compositeBackground(canvas: HTMLCanvasElement, src: string): Promise<void> {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  const backgroundImg = await loadImage(src);

  // `object-fit: cover` 와 같은 규칙으로 잘라 넣는다. 비율이 틀어지면 건물이 늘어난다.
  const scale = Math.max(
    canvas.width / backgroundImg.naturalWidth,
    canvas.height / backgroundImg.naturalHeight,
  );
  const drawWidth = backgroundImg.naturalWidth * scale;
  const drawHeight = backgroundImg.naturalHeight * scale;

  ctx.globalCompositeOperation = "destination-over";
  ctx.drawImage(
    backgroundImg,
    (canvas.width - drawWidth) / 2,
    (canvas.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  ctx.globalCompositeOperation = "source-over";
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob 실패"));
    }, PNG_MIME_TYPE);
  });
}

// endregion

/** 오버레이 이미지 목록. 캡처 시 합성할 이미지가 없으면 빈 배열. */
let registeredOverlays: OverlayImageInfo[] = [];

/** 캡처 결과 아래에 깔 배경 이미지. 없으면 `null`. */
let registeredBackgroundSrc: string | null = null;

/**
 * 캡처 후 합성할 오버레이 이미지를 등록한다.
 */
export function registerCaptureOverlay(overlay: OverlayImageInfo): void {
  registeredOverlays = [overlay];
}

/**
 * 캡처 결과 아래에 깔 배경 이미지를 등록한다.
 */
export function registerCaptureBackground(src: string): void {
  registeredBackgroundSrc = src;
}

/**
 * 등록된 오버레이와 배경을 해제한다.
 */
export function clearCaptureOverlays(): void {
  registeredOverlays = [];
  registeredBackgroundSrc = null;
}

/**
 * DOM → canvas → (오버레이·배경 합성) → Blob 파이프라인.
 */
async function captureToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas = await toCanvas(element, CAPTURE_OPTIONS);

  for (const overlay of registeredOverlays) {
    await compositeOverlay(canvas, overlay);
  }

  // 배경은 항상 마지막이다. 오버레이보다 먼저 깔면 destination-over 가 오버레이의
  // 투명 영역까지 덮어 그림자가 사라진다.
  if (registeredBackgroundSrc) {
    await compositeBackground(canvas, registeredBackgroundSrc);
  }

  return canvas;
}

/**
 * DOM 엘리먼트를 PNG Data URL 로 캡처한다.
 */
export async function captureElementToPngDataUrl(element: HTMLElement): Promise<string> {
  const canvas = await captureToCanvas(element);
  return canvas.toDataURL(PNG_MIME_TYPE);
}

/**
 * DOM 엘리먼트를 PNG Blob 으로 캡처한다.
 */
export async function captureElementToPngBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureToCanvas(element);
  return canvasToBlob(canvas);
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
