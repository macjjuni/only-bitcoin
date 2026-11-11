import { kToast } from "kku-ui";

/** 같은 소켓의 연결 토스트를 다시 띄우기까지 최소 간격. */
const CONNECTION_TOAST_COOLDOWN_IN_MILLISECONDS = 60_000;

/**
 * 소켓 연결 토스트를 띄우는 함수를 만듦.
 *
 * 소켓은 끊기면 무한히 다시 붙음. 연결이 불안정하면 붙을 때마다 토스트가 떠서
 * 화면을 덮으므로 1분에 한 번만 띄움.
 */
export const createConnectionToast = (message: string): (() => void) => {
  let lastShownAtInMilliseconds = Number.NEGATIVE_INFINITY;

  return () => {
    const nowInMilliseconds = Date.now();

    if (nowInMilliseconds - lastShownAtInMilliseconds < CONNECTION_TOAST_COOLDOWN_IN_MILLISECONDS) {
      return;
    }

    lastShownAtInMilliseconds = nowInMilliseconds;
    kToast.success(message);
  };
};
