export function isSafari() {
  return (
    navigator.userAgent.includes("Safari") &&
    !navigator.userAgent.includes("Chrome") &&
    navigator.vendor === "Apple Computer, Inc."
  );
}

export function isIOSSafari() {
  return (
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    /Apple Computer, Inc./.test(navigator.vendor) &&
    /iPhone|iPad|iPod/.test(navigator.userAgent) // iOS 디바이스인지 확인
  );
}

/** iPhone, iPad, iPod 및 데스크톱 모드로 요청하는 iPad인지 확인한다. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** 현재 기기가 Android 운영체제를 사용하는지 확인한다. */
export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function isPWAInstalled(): boolean {
  const navigatorStandalone = (window.navigator as NavigatorWithStandalone).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone === true;
}

export function isIOSPWA(): boolean {
  return isPWAInstalled();
}

export type DisplayMode =
  | "twa"
  | "ios_standalone"
  | "fullscreen"
  | "standalone"
  | "minimal-ui"
  | "window-controls-overlay"
  | "browser";

export type BrowserContext =
  | "inapp_kakao"
  | "inapp_naver"
  | "inapp_daum"
  | "inapp_meta"
  | "inapp_line"
  | "ios_browser"
  | "browser";

/**
 * 현재 세션이 설치된 앱(홈 화면 아이콘)에서 실행 중인지 판별함.
 * iOS 16.4 미만은 `navigator.standalone` 만 동작하므로 `ios_standalone` 으로 따로 분리해 집계함.
 */
export function detectDisplayMode(): DisplayMode {
  if (document.referrer.startsWith("android-app://")) return "twa";
  if ((window.navigator as NavigatorWithStandalone).standalone === true) return "ios_standalone";

  const modes = ["fullscreen", "standalone", "minimal-ui", "window-controls-overlay"] as const;
  const matched = modes.find((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);

  return matched ?? "browser";
}

/**
 * 인앱 브라우저 여부를 판별함. 카카오·네이버 인앱은 PWA 설치 자체가 불가능해서
 * standalone 비율과 겹쳐 봐야 설치 게이트의 실제 손실폭이 나옴.
 */
export function detectBrowserContext(): BrowserContext {
  const ua = navigator.userAgent;

  if (/KAKAOTALK/i.test(ua)) return "inapp_kakao";
  if (/NAVER[(]inapp/i.test(ua)) return "inapp_naver";
  if (/DaumApps/i.test(ua)) return "inapp_daum";
  if (/Instagram|FBAN|FBAV/i.test(ua)) return "inapp_meta";
  if (/Line[/]/i.test(ua)) return "inapp_line";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios_browser";

  return "browser";
}

let iosHapticLabel: HTMLLabelElement | null = null;

/**
 * iOS Safari(17.4+)에서 햅틱 피드백을 발생시키기 위한 숨김 스위치 input을 준비합니다.
 * iOS는 Vibration API를 차단하지만, `<input switch>` 토글 시 시스템 햅틱이 동작하는 점을 이용합니다.
 */
function getIOSHapticLabel(): HTMLLabelElement {
  if (iosHapticLabel) return iosHapticLabel;

  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", ""); // iOS 17.4+ 스위치 input

  label.appendChild(input);
  document.head.appendChild(label);

  iosHapticLabel = label;
  return label;
}

/**
 * 햅틱 피드백(진동)을 실행합니다.
 * - Android 등: Vibration API(`navigator.vibrate`) 사용
 * - iOS Safari(17.4+): 숨김 `<input switch>` 토글 트릭으로 시스템 햅틱 발생
 *
 * 미지원 환경에서는 조용히 무시됩니다.
 *
 * @param pattern 진동 패턴(ms). 단일 값 또는 [진동, 멈춤, ...] 배열. 기본값 10ms.
 */
export function vibrate(pattern: number | number[] = 10): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  // Android 등 Vibration API 지원 환경
  if (typeof navigator.vibrate === "function") {
    try {
      if (navigator.vibrate(pattern)) return;
    } catch {
      // 사용자 제스처 없이 호출 시 예외가 날 수 있어 무시하고 폴백 시도
    }
  }

  // iOS Safari 폴백: 스위치 input 토글
  try {
    const label = getIOSHapticLabel();
    label.click();
  } catch {
    // DOM 미준비 등 예외는 무시
  }
}
