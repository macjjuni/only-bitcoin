import { describe, expect, it } from "vitest";
import { landmarkApartmentList } from "@/entities/apartment";
import {
  APARTMENT_QUERY_KEY,
  buildApartmentQueryUrl,
  getFirstApartmentID,
  resolveApartmentIDFromQuery,
} from "./apartmentQuery";

const FIRST_ID = landmarkApartmentList[0].apartmentID;
const OTHER_ID = landmarkApartmentList[1].apartmentID;

describe("resolveApartmentIDFromQuery", () => {
  it("쿼리에 있는 단지를 그대로 쓴다", () => {
    expect(resolveApartmentIDFromQuery(`?${APARTMENT_QUERY_KEY}=${OTHER_ID}`)).toBe(OTHER_ID);
  });

  it("쿼리가 없으면 첫 번째 단지로 세운다", () => {
    expect(resolveApartmentIDFromQuery("")).toBe(FIRST_ID);
    expect(resolveApartmentIDFromQuery("?foo=bar")).toBe(FIRST_ID);
  });

  it("화이트리스트에 없는 값은 무시한다", () => {
    // 임의 문자열을 통과시키면 조회 0건인 빈 차트가 뜨고, 링크를 받은 쪽은
    // 데이터가 없는 단지로 오해한다.
    expect(resolveApartmentIDFromQuery(`?${APARTMENT_QUERY_KEY}=not-a-landmark`)).toBe(FIRST_ID);
    expect(resolveApartmentIDFromQuery(`?${APARTMENT_QUERY_KEY}=`)).toBe(FIRST_ID);
  });

  it("첫 번째 단지는 목록 순서를 따른다", () => {
    expect(getFirstApartmentID()).toBe(FIRST_ID);
  });
});

describe("buildApartmentQueryUrl", () => {
  it("쿼리를 붙인 주소를 만든다", () => {
    expect(buildApartmentQueryUrl("https://only-btc.app/btc2apartment", OTHER_ID)).toBe(
      `https://only-btc.app/btc2apartment?${APARTMENT_QUERY_KEY}=${OTHER_ID}`,
    );
  });

  it("이미 같은 값이면 null 을 돌려준다", () => {
    // 캐러셀은 슬라이드마다 이 경로를 타므로 불필요한 replaceState 를 막아야 한다.
    expect(
      buildApartmentQueryUrl(
        `https://only-btc.app/btc2apartment?${APARTMENT_QUERY_KEY}=${OTHER_ID}`,
        OTHER_ID,
      ),
    ).toBeNull();
  });

  it("다른 쿼리는 건드리지 않는다", () => {
    const url = buildApartmentQueryUrl(
      `https://only-btc.app/btc2apartment?utm_source=x&${APARTMENT_QUERY_KEY}=${FIRST_ID}`,
      OTHER_ID,
    );

    expect(url).toContain("utm_source=x");
    expect(url).toContain(`${APARTMENT_QUERY_KEY}=${OTHER_ID}`);
  });
});
