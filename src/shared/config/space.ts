import { chatConfig } from "./chat";
import { env } from "./env";

/** 채팅과 같은 Worker를 쓰되 별도 공간 엔드포인트로 연결한다. */
export const resolveSpaceWebSocketUrl = (chatWebSocketUrl: string): string => {
  return chatWebSocketUrl ? new URL("/v1/space/ws", chatWebSocketUrl).toString() : "";
};

/**
 * 광고 문의 연락처 표기.
 *
 * 별도 변수를 두지 않고 기존 피드백 URL(X 프로필)에서 핸들만 뽑는다. 문의를
 * 받는 사람이 같으므로 두 곳에 따로 적어두면 한쪽만 바뀐다. 파싱이 안 되는
 * 값이면 빈 문자열을 돌려주고, 호출부는 연락처 줄을 그리지 않는다.
 */
export const resolveAdContactLabel = (feedbackUrl: string): string => {
  const trimmedUrl = feedbackUrl.trim();

  if (trimmedUrl === "") {
    return "";
  }

  try {
    const { hostname, pathname } = new URL(trimmedUrl);
    // 피드백 URL 은 프로필이 아니라 특정 트윗일 수 있다. 첫 경로 조각만 쓴다.
    const [firstSegment = ""] = pathname.split("/").filter((segment) => segment !== "");

    if (firstSegment === "") {
      return "";
    }

    const isXHost =
      hostname === "x.com" ||
      hostname.endsWith(".x.com") ||
      hostname === "twitter.com" ||
      hostname.endsWith(".twitter.com");

    // 다른 호스트는 경로를 붙이지 않는다. 긴 경로가 배너 한 줄을 다 먹는다.
    return isXHost ? `X @${firstSegment}` : hostname;
  } catch {
    return "";
  }
};

export const spaceConfig = {
  webSocketUrl: resolveSpaceWebSocketUrl(chatConfig.webSocketUrl),
  isConnectionConfigured: chatConfig.webSocketUrl.length > 0,
  /**
   * 전광판 좌우 광고판과 전광판 위 텍스트 배너를 노출할지.
   *
   * 아직 광고를 팔지 않으므로 **코드에서 끈다.** 환경변수 스위치를 뒀더니 값을
   * 지우면 켜지는 기본값이라 빈 액자가 그대로 노출됐다. 판매 경로가 생길 때
   * 이 상수를 광고 조회 결과로 바꾼다. 벽면 장비함은 광고가 아니라 벽 구조라서
   * 이 값과 무관하게 남는다.
   */
  isAdEnabled: false,
  adContactLabel: resolveAdContactLabel(env.NEXT_PUBLIC_FEEDBACK_URL),
} as const;
