import { describe, expect, it } from "vitest";
import {
  countItemElements,
  isSuccessfulAptTradeResponse,
  parseAptTradeXml,
  readTotalCount,
} from "./parseAptTradeXml";

/** 실제 공공 API 응답에서 가져온 항목 형태 ( 필드 순서까지 동일 ) */
const makeItemXml = (overrides: Record<string, string> = {}) => {
  const fields: Record<string, string> = {
    aptDong: "104",
    aptNm: "래미안원베일리",
    buildYear: "2023",
    buyerGbn: "개인",
    cdealDay: " ",
    cdealType: " ",
    dealAmount: "560,000",
    dealDay: "31",
    dealMonth: "5",
    dealYear: "2025",
    dealingGbn: "중개거래",
    estateAgentSggNm: "서울 서초구",
    excluUseAr: "84.98",
    floor: "17",
    jibun: "1",
    landLeaseholdGbn: "N",
    rgstDate: "25.08.29",
    sggCd: "11650",
    slerGbn: "개인",
    umdNm: "반포동",
    ...overrides,
  };

  return `<item>${Object.entries(fields)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("")}</item>`;
};

const wrapResponse = (itemsXml: string, resultCode = "000", totalCount?: number) =>
  `<?xml version="1.0" encoding="utf-8" standalone="yes"?><response><header>` +
  `<resultCode>${resultCode}</resultCode><resultMsg>OK</resultMsg></header>` +
  `<body><items>${itemsXml}</items><numOfRows>10</numOfRows>` +
  (totalCount === undefined ? "" : `<totalCount>${totalCount}</totalCount>`) +
  `</body></response>`;

describe("parseAptTradeXml", () => {
  it("거래 항목을 파싱한다", () => {
    const trades = parseAptTradeXml(wrapResponse(makeItemXml()));

    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({
      aptName: "래미안원베일리",
      legalDongName: "반포동",
      jibun: "1",
      exclusiveAreaInSquareMeter: 84.98,
      priceInKrw: 5_600_000_000,
      dealDate: "2025-05-31",
      dealYear: 2025,
      floor: 17,
      dealingType: "중개거래",
    });
  });

  it("만원 단위 금액을 원 단위로 바꾸고 콤마를 제거한다", () => {
    const [trade] = parseAptTradeXml(wrapResponse(makeItemXml({ dealAmount: "1,234,500" })));

    expect(trade.priceInKrw).toBe(12_345_000_000);
  });

  it("월·일을 두 자리로 채워 ISO 형식 날짜를 만든다", () => {
    const [trade] = parseAptTradeXml(wrapResponse(makeItemXml({ dealMonth: "3", dealDay: "7" })));

    expect(trade.dealDate).toBe("2025-03-07");
  });

  it("계약해제 건(cdealType='O')은 제외한다", () => {
    const xml = wrapResponse(makeItemXml() + makeItemXml({ cdealType: "O" }));

    expect(parseAptTradeXml(xml)).toHaveLength(1);
  });

  it("금액이나 면적이 유효하지 않은 건은 제외한다", () => {
    const xml = wrapResponse(
      makeItemXml({ dealAmount: "" }) +
        makeItemXml({ excluUseAr: "" }) +
        makeItemXml({ excluUseAr: "0" }) +
        makeItemXml(),
    );

    expect(parseAptTradeXml(xml)).toHaveLength(1);
  });

  it("거래가 없는 응답은 빈 배열을 돌려준다", () => {
    expect(parseAptTradeXml(wrapResponse(""))).toEqual([]);
  });

  it("빈 문자열이나 깨진 응답에도 던지지 않는다", () => {
    expect(parseAptTradeXml("")).toEqual([]);
    expect(parseAptTradeXml("<html>error</html>")).toEqual([]);
  });

  it("층 정보가 없으면 0으로 채운다", () => {
    const [trade] = parseAptTradeXml(wrapResponse(makeItemXml({ floor: " " })));

    expect(trade.floor).toBe(0);
  });

  it("여러 건을 순서대로 파싱한다", () => {
    const xml = wrapResponse(
      makeItemXml({ aptNm: "반포자이" }) + makeItemXml({ aptNm: "래미안퍼스티지" }),
    );
    const trades = parseAptTradeXml(xml);

    expect(trades.map((trade) => trade.aptName)).toEqual(["반포자이", "래미안퍼스티지"]);
  });
});

describe("isSuccessfulAptTradeResponse", () => {
  it("resultCode가 000 또는 00이면 성공으로 본다", () => {
    expect(isSuccessfulAptTradeResponse(wrapResponse("", "000"))).toBe(true);
    expect(isSuccessfulAptTradeResponse(wrapResponse("", "00"))).toBe(true);
  });

  it("그 외 코드는 실패로 본다", () => {
    expect(isSuccessfulAptTradeResponse(wrapResponse("", "30"))).toBe(false);
    expect(isSuccessfulAptTradeResponse("")).toBe(false);
  });
});

/**
 * 이 두 함수가 잡는 버그:
 * `numOfRows` 를 넘는 달은 응답이 잘리는데, 잘렸다는 사실은 `totalCount` 와
 * 실제 `<item>` 수를 비교해야만 드러난다. 확인하지 않아 608개월 중 6개월이
 * 조용히 누락됐다 ( 송파구 2017-05 는 1,320건 중 999건만 들어왔다 ).
 */
describe("readTotalCount", () => {
  it("응답의 전체 건수를 읽는다", () => {
    expect(readTotalCount(wrapResponse(makeItemXml(), "000", 1320))).toBe(1320);
  });

  it("totalCount 가 없으면 0 을 돌려준다", () => {
    expect(readTotalCount(wrapResponse(makeItemXml()))).toBe(0);
  });
});

describe("countItemElements", () => {
  it("응답에 담긴 item 수를 센다", () => {
    const xml = wrapResponse(makeItemXml() + makeItemXml() + makeItemXml());

    expect(countItemElements(xml)).toBe(3);
  });

  it("item 이 없으면 0 이다", () => {
    expect(countItemElements(wrapResponse(""))).toBe(0);
  });

  /**
   * 파싱 결과 길이로 대신하면 안 된다. 해제 건이 걸러져 항상 이 값 이하가 되고,
   * 그 차이를 "잘렸다" 로 오해하면 있지도 않은 다음 페이지를 계속 요청하게 된다.
   */
  it("해제 건도 포함해 센다 ( 파싱 결과 길이와 다르다 )", () => {
    const xml = wrapResponse(makeItemXml() + makeItemXml({ cdealType: "O" }));

    expect(countItemElements(xml)).toBe(2);
    expect(parseAptTradeXml(xml)).toHaveLength(1);
  });
});
