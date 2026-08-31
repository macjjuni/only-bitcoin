import incidentsJson from "./incidents.json";

export type IncidentType = "hack" | "halt" | "bankruptcy" | "operational" | "protocol";

export interface Incident {
  id: string;
  /** `YYYY-MM` */
  date: string;
  name: string;
  country: string;
  type: IncidentType;
  summary: string;
  /** 원화 환산 추정치. 화면에는 노출하지 않고 정렬·막대 스케일에만 쓴다. */
  amount?: number;
  /** 화면에 그대로 노출하는 금액 문구. */
  amountText: string;
  tags?: string[];
  /** 주요 사건. 레일 노드를 키우고 확장 카드로 펼친다. */
  featured?: boolean;
  detail?: string;
  article: string;
}

interface IncidentsData {
  updatedAt: string;
  amountNote: string;
  events: Incident[];
}

export interface YearGroup {
  year: string;
  incidents: Incident[];
}

/** JSON 모듈은 필드가 빠진 객체까지 유니온으로 추론돼 쓰기 어려우므로 한 번만 단언한다. */
const data = incidentsJson as unknown as IncidentsData;

export const { updatedAt, amountNote } = data;

/** 연·월 오름차순. 원본이 이미 정렬돼 있어도 데이터가 늘어날 때를 대비해 한 번 더 정렬한다. */
export const INCIDENTS: Incident[] = [...data.events].sort((a, b) => a.date.localeCompare(b.date));

export const TOTAL_COUNT = INCIDENTS.length;
export const FIRST_YEAR = INCIDENTS[0].date.slice(0, 4);
export const LAST_YEAR = INCIDENTS[INCIDENTS.length - 1].date.slice(0, 4);

/** 연도별 묶음. 사건이 없는 해는 아예 만들지 않아 연표에서 연도가 건너뛰는 구조가 드러난다. */
export const YEAR_GROUPS: YearGroup[] = INCIDENTS.reduce<YearGroup[]>((groups, incident) => {
  const year = incident.date.slice(0, 4);
  const lastGroup = groups.at(-1);

  if (lastGroup?.year === year) {
    lastGroup.incidents.push(incident);
    return groups;
  }

  groups.push({ year, incidents: [incident] });
  return groups;
}, []);

/**
 * 막대 스케일 기준에서 빼는 사건.
 *
 * 빗썸 오지급(2026-02)은 명목 60조지만 99% 이상 회수돼 실제 손실과 자릿수가 다르다.
 * 이 값을 최댓값으로 잡으면 나머지 38건이 전부 실선처럼 눌린다.
 */
const SCALE_EXCLUDED_IDS = new Set(["2026-02-bithumb-payout"]);

const SCALE_MAX = Math.max(
  ...INCIDENTS.filter((incident) => !SCALE_EXCLUDED_IDS.has(incident.id)).map(
    (incident) => incident.amount ?? 0,
  ),
);

/**
 * 피해액 막대 길이 비율(0~1).
 *
 * 실제 금액이 148억 ~ 4조로 270배 차이라 선형 비례로 그리면 하위 구간이 전부 뭉갠다.
 * 제곱근으로 눌러 순서는 유지하면서 작은 사건도 길이 차이가 보이게 했다.
 */
export function getAmountRatio(amount?: number): number {
  if (!amount) return 0;

  return Math.min(Math.sqrt(amount / SCALE_MAX), 1);
}

/** 유형 배지 문구. */
export const TYPE_LABEL: Record<IncidentType, string> = {
  hack: "해킹",
  halt: "출금중지",
  bankruptcy: "파산",
  operational: "운영사고",
  protocol: "프로토콜",
};
