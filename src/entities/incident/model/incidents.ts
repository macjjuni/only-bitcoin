import exchangeIncidentsJson from "./exchange-incidents.json";

export type IncidentType = "hack" | "halt" | "bankruptcy" | "error";

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
  detail?: string;
  article: string;
}

interface ExchangeIncidentsData {
  updatedAt: string;
  events: IncidentEvent[];
}

/** JSON의 선택 필드가 객체별 유니온으로 추론되므로 스키마 경계에서 한 번만 단언한다. */
const exchangeIncidentsData = exchangeIncidentsJson as unknown as ExchangeIncidentsData;

/** 원본 순서를 신뢰하지 않고 화면에서 사용할 사건을 발생 월 오름차순으로 다시 정렬한다. */
export const incidentEvents = [...exchangeIncidentsData.events].sort(
  (firstIncident, secondIncident) => firstIncident.date.localeCompare(secondIncident.date),
);

export const incidentIDs: readonly string[] = incidentEvents.map((incident) => incident.id);
export const incidentsUpdatedAt = exchangeIncidentsData.updatedAt;
