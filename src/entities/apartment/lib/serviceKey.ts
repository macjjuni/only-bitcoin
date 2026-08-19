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

/**
 * 한 페이지로 받을 최대 건수.
 *
 * 999 를 쓰다가 **조용한 누락**을 만들었다. 이 API 는 `numOfRows` 를 넘는 건수를
 * 잘라서 주면서 `totalCount` 에만 진짜 수를 담는데, 그걸 확인하지 않았다.
 * 608개월 전수 조사에서 6개월이 잘려 있었다.
 *   송파구 201705( 1,320건 ) · 202006( 1,173건 ) · 201707( 1,074건 ) · 201606( 1,057건 )
 *   강남구 201705( 1,177건 ) · 201707( 1,009건 )
 * 2017-05 는 강남·송파 모두 잘린 달이라 은마·도곡렉슬·잠실엘스가 동시에 영향을 받았다.
 *
 * 실측 상한은 송파구 2017-05 의 1,320건이므로 3,000 이면 한 페이지로 끝난다.
 * 그래도 호출부는 `totalCount` 를 확인하고 부족하면 다음 페이지를 이어 받는다
 * ( `readTotalCount` ). 상수 하나에 정확성을 걸지 않기 위해서다.
 */
export const MAX_ROWS_PER_PAGE = 3000;

/** `(지역코드 × 월)` 한 칸을 조회할 URL 을 만든다. */
export function buildAptTradeUrl(
  serviceKey: string,
  lawdCode: string,
  dealYearMonth: string,
  pageNo = 1,
): string {
  const searchParams = new URLSearchParams({
    LAWD_CD: lawdCode,
    DEAL_YMD: dealYearMonth,
    pageNo: String(pageNo),
    numOfRows: String(MAX_ROWS_PER_PAGE),
  });

  return `${APT_TRADE_URL}?serviceKey=${normalizeServiceKey(serviceKey)}&${searchParams.toString()}`;
}
