/**
 * 서비스 키를 URL 에 넣을 형태로 정규화한다.
 *
 * 공공데이터포털은 키를 **인코딩 / 디코딩 두 가지 형태**로 발급한다.
 * - 인코딩: `...yl%2BvRk...DqQ%3D%3D`
 * - 디코딩: `...yl+vRk...DqQ==`
 *
 * 인코딩된 키를 그대로 `encodeURIComponent` 하면 `%` 가 `%25` 가 되어 인증이 깨지고,
 * 디코딩된 키를 그대로 붙이면 `+` 가 공백으로 해석되어 역시 깨진다.
 * 한 번 디코딩해 원본으로 되돌린 뒤 다시 인코딩하면 어느 형태로 넣어도 동작한다.
 * ( Base64 원본에는 `%` 가 없으므로 디코딩이 값을 훼손하지 않는다 )
 */
export function normalizeServiceKey(rawServiceKey: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(rawServiceKey));
  } catch {
    // 잘못된 `%` 시퀀스가 섞인 경우 디코딩을 건너뛴다.
    return encodeURIComponent(rawServiceKey);
  }
}

/** 국토교통부 아파트 매매 실거래가 조회 엔드포인트 */
export const APT_TRADE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

/** 한 달치는 999건이면 충분하다. 강남 3구 최대 월도 700건대. */
export const MAX_ROWS_PER_MONTH = 999;

/** `(지역코드 × 월)` 한 칸을 조회할 URL 을 만든다. */
export function buildAptTradeUrl(
  serviceKey: string,
  lawdCode: string,
  dealYearMonth: string,
): string {
  const searchParams = new URLSearchParams({
    LAWD_CD: lawdCode,
    DEAL_YMD: dealYearMonth,
    pageNo: "1",
    numOfRows: String(MAX_ROWS_PER_MONTH),
  });

  return `${APT_TRADE_URL}?serviceKey=${normalizeServiceKey(serviceKey)}&${searchParams.toString()}`;
}
