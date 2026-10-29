import { type IncidentType, incidentEvents } from "@/entities/incident";

// 사건 데이터는 `/orange` 의 NEW 배지도 써야 해서 entities 로 옮겼음. 화면 전용 계산만 여기 둠.
export type { IncidentEvent, IncidentType } from "@/entities/incident";
export { incidentEvents, incidentsUpdatedAt } from "@/entities/incident";

export interface IncidentYearAnchor {
  year: string;
  incidentIndex: number;
}

export const totalIncidentCount = incidentEvents.length;
export const firstIncidentYear = incidentEvents[0].date.slice(0, 4);
export const lastIncidentYear = incidentEvents[incidentEvents.length - 1].date.slice(0, 4);

/** 유형 라벨은 데이터 파일이 아니라 코드에서 관리한다. */
export const incidentTypeLabels: Record<IncidentType, string> = {
  hack: "해킹",
  halt: "자금 지급 중단",
  bankruptcy: "파산",
  error: "운영 오류",
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

/** 두 `YYYY-MM` 날짜 사이의 개월 수를 계산한다. */
export function calculateMonthsBetween(earlierDate: string, laterDate: string): number {
  const earlierYear = Number(earlierDate.slice(0, 4));
  const earlierMonth = Number(earlierDate.slice(5, 7));
  const laterYear = Number(laterDate.slice(0, 4));
  const laterMonth = Number(laterDate.slice(5, 7));

  return (laterYear - earlierYear) * 12 + (laterMonth - earlierMonth);
}

/** `2025-11`을 타임라인용 `2025.11`로 변환한다. */
export function formatIncidentShortDate(incidentDate: string): string {
  return `${incidentDate.slice(0, 4)}.${incidentDate.slice(5, 7)}`;
}

/** `2025-11`을 상세 정보와 접근성 라벨용 `2025년 11월`로 변환한다. */
export function formatIncidentFullDate(incidentDate: string): string {
  return `${incidentDate.slice(0, 4)}년 ${Number(incidentDate.slice(5, 7))}월`;
}
