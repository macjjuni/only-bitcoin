

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

export function isIOSPWA(): boolean {
  const navigatorStandalone = (window.navigator as any).standalone;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone;

  return Boolean(isStandalone);
}
