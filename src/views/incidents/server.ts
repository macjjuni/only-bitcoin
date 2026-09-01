import { env } from "@/shared/config/env";
import { ORGANIZATION_ID } from "@/shared/config/jsonLd";
import {
  firstIncidentYear,
  incidentEvents,
  incidentsUpdatedAt,
  lastIncidentYear,
} from "./model/incidents";

const INCIDENTS_PAGE_PATH = "/incidents";
const INCIDENTS_PAGE_URL = `${env.NEXT_PUBLIC_URL}${INCIDENTS_PAGE_PATH}`;

export const incidentsPageTitle = "거래소 사고 연표" as const;
export const incidentsPageDescription = `${firstIncidentYear}년부터 ${lastIncidentYear}년까지 주요 가상자산 거래소 사고를 시간순으로 확인하세요.`;

export { incidentsUpdatedAt };

/** 거래소 사고 연표와 화면에 표시되는 사건 목록을 구조화 데이터로 만든다. */
export function createIncidentsTimelineSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${INCIDENTS_PAGE_URL}#webpage`,
    url: INCIDENTS_PAGE_URL,
    name: incidentsPageTitle,
    description: incidentsPageDescription,
    dateModified: incidentsUpdatedAt,
    inLanguage: "ko-KR",
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: {
      "@type": "ItemList",
      name: "가상자산 거래소 사고 목록",
      numberOfItems: incidentEvents.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: incidentEvents.map((incident, incidentIndex) => ({
        "@type": "ListItem",
        position: incidentIndex + 1,
        item: {
          "@type": "Thing",
          identifier: incident.id,
          name: `${incident.date} ${incident.name}`,
          description: incident.summary,
          subjectOf: {
            "@type": "Article",
            url: incident.article,
          },
        },
      })),
    },
  };
}
