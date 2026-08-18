import type { LandmarkApartment } from "./types";

/**
 * 랜드마크 단지 화이트리스트.
 *
 * 클라이언트는 `apartmentID` 만 넘기고 `LAWD_CD` 는 직접 지정하지 못한다.
 * 이 목록에 없는 식별자는 404 로 막아, 임의 지역을 긁는 오픈 프록시로 악용되는 것을 차단한다.
 *
 * `aptNames` 는 2024~2025 실거래 표본( 4개 구 15,933건 )으로 실제 표기를 확인한 값이다.
 * 임의로 추정해서 넣으면 조회 결과가 0건이 되므로( 예: 존재하지 않는 `압구정현대` )
 * 항목을 추가할 때는 반드시 공공 API 응답으로 표기를 검증한다.
 */
const landmarkApartments: LandmarkApartment[] = [
  {
    apartmentID: "raemian-one-bailey",
    displayName: "래미안원베일리",
    lawdCode: "11650",
    districtName: "서울 서초구",
    legalDongName: "반포동",
    aptNames: ["래미안원베일리"],
    jibunList: ["1"],
    earliestDealYear: 2023,
  },
  {
    apartmentID: "banpo-xi",
    displayName: "반포자이",
    lawdCode: "11650",
    districtName: "서울 서초구",
    legalDongName: "반포동",
    // 부분일치를 쓰면 잠원동 `신반포자이` 가 섞인다.
    aptNames: ["반포자이"],
    jibunList: ["20-43"],
    earliestDealYear: 2009,
  },
  {
    apartmentID: "raemian-firstige",
    displayName: "래미안퍼스티지",
    lawdCode: "11650",
    districtName: "서울 서초구",
    legalDongName: "반포동",
    aptNames: ["래미안퍼스티지"],
    jibunList: ["18-1"],
    earliestDealYear: 2009,
  },
  {
    apartmentID: "acro-river-park",
    displayName: "아크로리버파크",
    lawdCode: "11650",
    districtName: "서울 서초구",
    legalDongName: "반포동",
    // 부분일치를 쓰면 `아크로리버뷰신반포`( 잠원동 )·`방배아크로리버`( 방배동 )가 섞인다.
    aptNames: ["아크로리버파크"],
    jibunList: ["2-12"],
    earliestDealYear: 2016,
  },
  {
    apartmentID: "eunma",
    displayName: "은마",
    lawdCode: "11680",
    districtName: "서울 강남구",
    legalDongName: "대치동",
    aptNames: ["은마"],
    jibunList: ["316"],
    earliestDealYear: 2014,
  },
  {
    apartmentID: "apgujeong-hyundai-6",
    displayName: "압구정 현대6차",
    lawdCode: "11680",
    districtName: "서울 강남구",
    legalDongName: "압구정동",
    /**
     * 압구정동은 25개 단지로 파편화되어 있고( 현대1~14차 / 신현대9~12차 / 한양1~8 등 )
     * 차수별 중앙값이 43억~80억으로 벌어져 통합하면 값이 왜곡된다.
     * 거래가 많고 상징성이 큰 6차만 채택한다. 84㎡ 가 없어 기본 평형은 144㎡ 가 된다.
     */
    aptNames: ["현대6차(78~81,83,84,86,87동)"],
    jibunList: ["456"],
    earliestDealYear: 2014,
  },
  {
    apartmentID: "dogok-rexle",
    displayName: "도곡렉슬",
    lawdCode: "11680",
    districtName: "서울 강남구",
    legalDongName: "도곡동",
    aptNames: ["도곡렉슬"],
    jibunList: ["527"],
    earliestDealYear: 2014,
  },
  {
    apartmentID: "tower-palace-1",
    displayName: "타워팰리스1",
    lawdCode: "11680",
    districtName: "서울 강남구",
    legalDongName: "도곡동",
    // 1/2/3차는 별개 단지다. 84㎡ 가 존재하는 것은 1차뿐이라 1차만 채택한다.
    aptNames: ["타워팰리스1"],
    jibunList: ["467"],
    earliestDealYear: 2014,
  },
  {
    apartmentID: "jamsil-else",
    displayName: "잠실엘스",
    lawdCode: "11710",
    districtName: "서울 송파구",
    legalDongName: "잠실동",
    aptNames: ["잠실엘스"],
    jibunList: ["19"],
    earliestDealYear: 2014,
  },
  {
    apartmentID: "helio-city",
    displayName: "헬리오시티",
    lawdCode: "11710",
    districtName: "서울 송파구",
    legalDongName: "가락동",
    aptNames: ["헬리오시티"],
    jibunList: ["913"],
    earliestDealYear: 2018,
  },
  {
    apartmentID: "mapo-raemian-prugio",
    displayName: "마포래미안푸르지오",
    lawdCode: "11440",
    districtName: "서울 마포구",
    legalDongName: "아현동",
    // 지번이 모두 아현동 777 로 동일한 하나의 단지가 4개 표기로 쪼개져 있어 통합한다.
    aptNames: [
      "마포래미안푸르지오1단지",
      "마포래미안푸르지오2단지",
      "마포래미안푸르지오3단지",
      "마포래미안푸르지오4단지",
    ],
    jibunList: ["777"],
    earliestDealYear: 2014,
  },
];

/** 화이트리스트 전체 ( 선택 목록 렌더링용 ) */
export const landmarkApartmentList: readonly LandmarkApartment[] = landmarkApartments;

/** 기본 선택 단지 */
export const DEFAULT_APARTMENT_ID = "raemian-one-bailey";

/**
 * 식별자로 랜드마크를 찾는다. 화이트리스트에 없으면 `undefined` 를 돌려주고,
 * 호출부는 이를 404 로 변환한다.
 */
export function findLandmarkApartment(apartmentID: string): LandmarkApartment | undefined {
  return landmarkApartments.find((apartment) => apartment.apartmentID === apartmentID);
}
