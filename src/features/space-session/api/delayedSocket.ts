import type { SpaceSessionSocket } from "./spaceSessionController";

const socketOpenState = 1;
const maximumDelayMs = 2_000;

/**
 * 개발용 지연 값을 주소에서 읽음. `?lag=200` 이면 편도 200ms(왕복 400ms).
 *
 * 배포본에서는 항상 0. 숫자가 아니거나 0 이하면 지연 없음.
 */
export const resolveDebugSocketDelayMs = (search: string, isDevelopment: boolean): number => {
  if (!isDevelopment) {
    return 0;
  }
  const delayMs = Number(new URLSearchParams(search).get("lag"));

  return Number.isFinite(delayMs) && delayMs > 0 ? Math.min(maximumDelayMs, delayMs) : 0;
};

/**
 * 송신·수신을 각각 `delayMs` 만큼 늦추는 소켓 래퍼. 느린 연결을 눈으로 확인할 때 씀.
 *
 * 같은 지연의 타이머는 등록 순서대로 울려서 프레임 순서는 안 바뀜. 연결·종료·오류
 * 이벤트는 늦추지 않음. 닫힌 뒤 도착한 수신은 컨트롤러가 세대 검사로 버림.
 */
export const createDelayedSocket = (
  socket: SpaceSessionSocket,
  delayMs: number,
): SpaceSessionSocket => ({
  get readyState() {
    return socket.readyState;
  },
  get bufferedAmount() {
    return socket.bufferedAmount;
  },
  get binaryType() {
    return socket.binaryType;
  },
  set binaryType(binaryType: BinaryType) {
    socket.binaryType = binaryType;
  },
  addEventListener: (type, listener) => {
    socket.addEventListener(
      type,
      type === "message" ? (event) => setTimeout(() => listener(event), delayMs) : listener,
    );
  },
  send: (payload) => {
    setTimeout(() => {
      if (socket.readyState !== socketOpenState) {
        return;
      }
      try {
        socket.send(payload);
      } catch {
        // 끊김은 close 이벤트로 컨트롤러가 처리함.
      }
    }, delayMs);
  },
  close: (code, reason) => socket.close(code, reason),
});
