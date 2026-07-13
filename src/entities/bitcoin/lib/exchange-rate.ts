// region [Types]
interface NaverCurrency {
  currencyUnit: string; // 통화 단위, 예: "달러", "원"
  subValue: string; // 표시용 값, 예: "1 달러", "1,391 원"
  value: string; // 실제 숫자값 문자열, 예: "1", "1,391"
}

export interface NaverExchangeRateResponse {
  pkid: number; // API 식별 ID, 예: 141
  count: number; // 결과 개수, 예: 1
  country: NaverCurrency[]; // 통화 정보 배열
  calculatorMessage: string; // 메시지, 보통 빈 문자열
}
// endregion

export const NAVER_EXCHANGE_RATE_URL = `https://m.search.naver.com/p/csearch/content/qapirender.nhn?key=calculator&pkid=141&q=%ED%99%98%EC%9C%A8&where=m&u1=keb&u6=standardUnit&u7=0&u3=USD&u4=KRW&u8=down&u2=1`;

/**
 * 네이버 환율 응답에서 USD → KRW 환율을 뽑는다.
 * 서버(SSR 초기값)와 클라이언트 쿼리 양쪽에서 쓰이므로 순수 함수로 분리한다.
 *
 * @returns 환율. 응답에 원화 항목이 없으면 null.
 */
export const parseUsdExchangeRate = (res: NaverExchangeRateResponse): number | null => {
  const krwData = res?.country?.find((currency) => currency.currencyUnit === "원");
  if (!krwData) return null;

  return parseFloat(krwData.value.replace(/,/g, ""));
};
