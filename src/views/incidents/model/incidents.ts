import exchangeIncidentsJson from "./exchange-incidents.json";

export type IncidentType = "hack" | "halt" | "bankruptcy" | "operational" | "protocol";

export interface IncidentEvent {
  /** 상세 페이지 슬러그로도 사용하는 사건 식별자. */
  id: string;
  /** `YYYY-MM` 형식의 사건 발생 월. */
  date: string;
  name: string;
  country: string;
  type: IncidentType;
  summary: string;
  /** 원화 추정치. 화면에는 직접 포맷하지 않고 `amountText`만 노출한다. */
  amount?: number;
  amountText: string;
  tags?: string[];
  featured?: boolean;
  detail?: string;
  article: string;
}

interface ExchangeIncidentsData {
  updatedAt: string;
  amountNote: string;
  types: IncidentType[];
  events: IncidentEvent[];
}

export interface IncidentYearAnchor {
  year: string;
  incidentIndex: number;
}

/** JSON의 선택 필드가 객체별 유니온으로 추론되므로 스키마 경계에서 한 번만 단언한다. */
const exchangeIncidentsData = exchangeIncidentsJson as unknown as ExchangeIncidentsData;

/** 원본 순서를 신뢰하지 않고 화면에서 사용할 사건을 발생 월 오름차순으로 다시 정렬한다. */
export const incidentEvents = [...exchangeIncidentsData.events].sort(
  (firstIncident, secondIncident) => firstIncident.date.localeCompare(secondIncident.date),
);

export const totalIncidentCount = incidentEvents.length;
export const firstIncidentYear = incidentEvents[0].date.slice(0, 4);
export const lastIncidentYear = incidentEvents[incidentEvents.length - 1].date.slice(0, 4);
export const incidentsUpdatedAt = exchangeIncidentsData.updatedAt;

/** 유형 라벨은 데이터 파일이 아니라 코드에서 관리한다. */
export const incidentTypeLabels: Record<IncidentType, string> = {
  hack: "해킹",
  halt: "출금중지",
  protocol: "프로토콜",
  operational: "운영사고",
  bankruptcy: "파산",
};

/** 각 연도가 처음 등장하는 사건을 연도 점프 대상으로 만든다. */
export const incidentYearAnchors = incidentEvents.reduce<IncidentYearAnchor[]>(
  (yearAnchors, incident, incidentIndex) => {
    const incidentYear = incident.date.slice(0, 4);

    if (yearAnchors.at(-1)?.year !== incidentYear) {
      yearAnchors.push({ year: incidentYear, incidentIndex });
    }

    return yearAnchors;
  },
  [],
);

const incidentAmountsInKrw = incidentEvents
  .map((incident) => incident.amount)
  .filter((amountInKrw): amountInKrw is number => {
    return typeof amountInKrw === "number" && amountInKrw > 0;
  });
const minimumIncidentAmountInKrw = Math.min(...incidentAmountsInKrw);
const maximumIncidentAmountInKrw = Math.max(...incidentAmountsInKrw);
const minimumAmountRatio = 0.08;
const timelineNodeBaseDiameterInPixels = 8;
const timelineNodeDiameterRangeInPixels = 10;

/**
 * 피해액을 0.08~1 범위의 로그 스케일 비율로 변환한다.
 *
 * 금액이 없는 사건도 최소 비율을 사용해 노드가 사라지지 않게 한다.
 */
export function calculateIncidentAmountRatio(amountInKrw?: number): number {
  if (!amountInKrw || amountInKrw <= 0) {
    return minimumAmountRatio;
  }

  const logarithmicAmountRatio =
    (Math.log(amountInKrw) - Math.log(minimumIncidentAmountInKrw)) /
    (Math.log(maximumIncidentAmountInKrw) - Math.log(minimumIncidentAmountInKrw));

  return Math.min(Math.max(logarithmicAmountRatio, minimumAmountRatio), 1);
}

/** 로그 스케일 피해액 비율을 8.8~18px 범위의 노드 지름으로 변환한다. */
export function calculateTimelineNodeDiameter(amountInKrw?: number): number {
  return (
    timelineNodeBaseDiameterInPixels +
    calculateIncidentAmountRatio(amountInKrw) * timelineNodeDiameterRangeInPixels
  );
}

/** `2025-11`을 타임라인용 `25.11`로 변환한다. */
export function formatIncidentShortDate(incidentDate: string): string {
  return `${incidentDate.slice(2, 4)}.${incidentDate.slice(5, 7)}`;
}

/** `2025-11`을 상세 정보와 접근성 라벨용 `2025년 11월`로 변환한다. */
export function formatIncidentFullDate(incidentDate: string): string {
  return `${incidentDate.slice(0, 4)}년 ${Number(incidentDate.slice(5, 7))}월`;
}
