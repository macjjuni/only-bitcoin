/**
 * 운영에서 IP guard 키당 허용하는 공간 연결 수.
 *
 * 2다. 1이면 재접속이 자기 자신에게 막힌다. 모바일 백그라운드 복귀나 네트워크
 * 전환처럼 서버가 FIN을 못 받는 끊김에서는 죽은 소켓이 `STALE_CONNECTION_MS`
 * 동안 슬롯을 들고 있어, 살아난 클라이언트의 재접속이 60초 내내 429를 맞는다.
 * 그 429들이 업그레이드 리미터까지 포화시키면 몇 초 장애가 몇 분으로 늘어난다.
 *
 * 좌석 중복은 이 숫자가 막는 게 아니다. 같은 신원의 두 번째 연결은 입장할 때
 * stableActorKey로 기존 좌석을 물려받고 옛 소켓을 `SESSION_REPLACED`로 닫는다.
 * 전체 소켓 수도 좌석 50 + 대기 10으로 따로 묶여 있다. 이 숫자가 하는 일은
 * 한 네트워크가 소켓을 쌓는 것을 막는 것뿐이라 2로도 충분하다.
 */
const MAXIMUM_PRODUCTION_IP_CONNECTIONS = 2;

/** 로컬 Worker의 명시적 개발 설정에서만 IP별 연결 제한을 해제한다. */
export const getSpaceIpConnectionLimit = (
  requestUrl: URL,
  isLocalLimitDisabled: boolean,
): number => {
  const isLocalHost = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

  return isLocalHost && isLocalLimitDisabled
    ? Number.POSITIVE_INFINITY
    : MAXIMUM_PRODUCTION_IP_CONNECTIONS;
};
