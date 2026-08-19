import type { ApartmentTrade } from "../model/types";

/**
 * 공공데이터포털 아파트 매매 실거래가 XML 파서.
 *
 * 응답이 중첩 없는 평평한 `<item>` 목록이라 XML 라이브러리를 들이지 않고 처리한다.
 * ( 서버 전용이라 번들 크기와도 무관하지만, 의존성을 늘리지 않는 편이 낫다 )
 */

/** `<item>` 하나에서 태그 값을 꺼낸다. 값이 없으면 빈 문자열. */
function readTagValue(itemXml: string, tagName: string): string {
  const matched = itemXml.match(new RegExp(`<${tagName}>([^<]*)</${tagName}>`));

  if (!matched) {
    return "";
  }

  return matched[1].trim();
}

/**
 * '403,000'( 만원 단위 ) → 4_030_000_000( 원 ).
 * 파싱에 실패하면 0 을 돌려주고 호출부에서 걸러낸다.
 */
function parseDealAmountToKrw(rawAmount: string): number {
  const parsed = Number.parseInt(rawAmount.replace(/,/g, ""), 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed * 10_000;
}

/** '2025', '5', '31' → '2025-05-31' */
function buildDealDate(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * 계약이 해제된 거래인지 여부.
 * `cdealType` 이 'O' 면 신고 후 해제된 건이라 실제 성사되지 않았다.
 */
function isCanceledDeal(itemXml: string): boolean {
  return readTagValue(itemXml, "cdealType") === "O";
}

/**
 * XML 응답을 거래 목록으로 변환한다.
 *
 * 계약해제 건과 금액·면적이 유효하지 않은 건은 제외한다.
 * 응답 자체가 오류이거나 거래가 없으면 빈 배열을 돌려준다.
 */
export function parseAptTradeXml(xml: string): ApartmentTrade[] {
  const trades: ApartmentTrade[] = [];

  for (const itemXml of xml.split("<item>").slice(1)) {
    if (isCanceledDeal(itemXml)) {
      continue;
    }

    const priceInKrw = parseDealAmountToKrw(readTagValue(itemXml, "dealAmount"));
    const exclusiveAreaInSquareMeter = Number.parseFloat(readTagValue(itemXml, "excluUseAr"));
    const dealYear = Number.parseInt(readTagValue(itemXml, "dealYear"), 10);
    const dealMonth = readTagValue(itemXml, "dealMonth");
    const dealDay = readTagValue(itemXml, "dealDay");

    const hasValidValues =
      priceInKrw > 0 &&
      Number.isFinite(exclusiveAreaInSquareMeter) &&
      exclusiveAreaInSquareMeter > 0 &&
      Number.isFinite(dealYear) &&
      dealMonth !== "" &&
      dealDay !== "";

    if (!hasValidValues) {
      continue;
    }

    trades.push({
      aptName: readTagValue(itemXml, "aptNm"),
      legalDongName: readTagValue(itemXml, "umdNm"),
      jibun: readTagValue(itemXml, "jibun"),
      exclusiveAreaInSquareMeter,
      priceInKrw,
      dealDate: buildDealDate(String(dealYear), dealMonth, dealDay),
      dealYear,
      floor: Number.parseInt(readTagValue(itemXml, "floor"), 10) || 0,
      dealingType: readTagValue(itemXml, "dealingGbn"),
    });
  }

  return trades;
}

/** 응답 헤더의 `resultCode` 가 정상('00' 또는 '000')인지 확인한다. */
export function isSuccessfulAptTradeResponse(xml: string): boolean {
  const resultCode = readTagValue(xml, "resultCode");

  return resultCode === "00" || resultCode === "000";
}

/**
 * 그 달의 **전체** 거래 건수.
 *
 * `numOfRows` 를 넘으면 응답이 잘리는데, 잘렸다는 사실은 이 값과 실제 `<item>` 수를
 * 비교해야만 알 수 있다. 확인하지 않으면 "거래가 그만큼뿐" 인 것처럼 보인다.
 */
export function readTotalCount(xml: string): number {
  const parsed = Number.parseInt(readTagValue(xml, "totalCount"), 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

/**
 * 응답에 실제로 담긴 `<item>` 수.
 *
 * `parseAptTradeXml` 의 결과 길이로는 대신할 수 없다. 그쪽은 계약 해제 건과
 * 무효 건을 걸러내므로 항상 이 값 이하가 되고, 그 차이를 "잘렸다" 로 오해하면
 * 있지도 않은 다음 페이지를 무한히 요청하게 된다.
 */
export function countItemElements(xml: string): number {
  return xml.split("<item>").length - 1;
}
