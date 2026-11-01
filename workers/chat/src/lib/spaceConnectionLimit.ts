const MAXIMUM_PRODUCTION_IP_CONNECTIONS = 1;

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
