

export function isSafari() {
  return (
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome') &&
    navigator.vendor === 'Apple Computer, Inc.'
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
