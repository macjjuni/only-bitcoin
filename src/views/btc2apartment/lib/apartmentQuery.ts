import { findLandmarkApartment, landmarkApartmentList } from "@/entities/apartment";

/** 선택한 단지를 담는 쿼리 키. `/btc2apartment?apartment=jamsil-else` */
export const APARTMENT_QUERY_KEY = "apartment";

/** 쿼리에 아무것도 없을 때 세울 단지 */
export function getFirstApartmentID(): string {
  return landmarkApartmentList[0].apartmentID;
}

/**
 * URL 쿼리에서 표시할 단지를 정한다.
 *
 * 외부 링크로 들어온 사용자가 곧바로 그 단지를 보게 하는 것이 목적이므로
 * **쿼리가 저장된 선택보다 우선**한다.
 *
 * 화이트리스트에 없는 값은 무시한다. 임의의 문자열이 그대로 통과하면
 * 조회가 0건인 빈 차트가 뜨고, 링크를 받은 쪽은 데이터가 없는 단지로 오해한다.
 */
export function resolveApartmentIDFromQuery(search: string): string {
  const queryValue = new URLSearchParams(search).get(APARTMENT_QUERY_KEY);

  if (queryValue && findLandmarkApartment(queryValue)) {
    return queryValue;
  }

  return getFirstApartmentID();
}

/**
 * 현재 URL 에 단지를 반영한 주소를 만든다. 바뀔 게 없으면 `null`.
 *
 * `null` 을 구분하는 이유는 `replaceState` 를 불필요하게 호출하지 않기 위해서다.
 * 캐러셀은 슬라이드마다 이 경로를 타므로 매번 히스토리를 건드리면 낭비다.
 */
export function buildApartmentQueryUrl(href: string, apartmentID: string): string | null {
  const url = new URL(href);

  if (url.searchParams.get(APARTMENT_QUERY_KEY) === apartmentID) {
    return null;
  }

  url.searchParams.set(APARTMENT_QUERY_KEY, apartmentID);

  return url.toString();
}
