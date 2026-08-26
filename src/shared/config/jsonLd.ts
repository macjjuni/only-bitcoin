import { env } from "@/shared/config/env";

const BASE_URL = env.NEXT_PUBLIC_URL;

/** 다른 스키마에서 `@id` 로 참조함. 같은 실체를 여러 번 정의하지 않으려고 씀. */
export const ORGANIZATION_ID = `${BASE_URL}/#organization`;
const WEBSITE_ID = `${BASE_URL}/#website`;

/**
 * `</script>` 로 태그가 조기 종료되는 걸 막음.
 *
 * 지금 넣는 값은 전부 우리가 쓴 정적 문자열이지만, 나중에 API 응답 같은 걸 섞으면
 * 그때 사고가 남. 주입 지점에서 한 번 막아 두는 게 맞음.
 */
export function serializeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

/** 브랜드 실체. 지식 패널·브랜드 검색에서 쓰임. */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "온리 비트코인",
  alternateName: env.NEXT_PUBLIC_TITLE,
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/app/icon-512x512.png`,
    width: 512,
    height: 512,
  },
  sameAs: [env.NEXT_PUBLIC_FEEDBACK_URL],
} as const;

/** 사이트 실체. */
export const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: BASE_URL,
  name: "온리 비트코인",
  alternateName: env.NEXT_PUBLIC_TITLE,
  inLanguage: "ko-KR",
  publisher: { "@id": ORGANIZATION_ID },
} as const;

interface WebApplicationParams {
  /** 페이지 고유 제목. */
  name: string;
  description: string;
  /** 라우트 경로. */
  path: string;
}

/**
 * 계산기·조회 도구 페이지용.
 *
 * 리치 결과로 뜨지는 않지만 페이지가 "읽을거리" 가 아니라 "쓰는 도구" 라는 걸
 * 크롤러와 AI 검색이 구분하게 해 줌.
 */
export function createWebApplicationSchema({ name, description, path }: WebApplicationParams) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: `${BASE_URL}${path}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * 문답 섹션용.
 *
 * **문항과 답변은 화면에 실제로 보이는 문구여야 함.** 안 보이는 내용을 넣으면
 * 구글 구조화 데이터 정책 위반임. 그래서 각 페이지의 상수는 해당 가이드 컴포넌트
 * 옆에 두고 화면 문구를 그대로 옮겨 씀.
 */
export function createFaqSchema(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

interface BreadcrumbItem {
  name: string;
  /** 라우트 경로. */
  path: string;
}

/** 상위 경로가 실제로 있는 페이지에서만 씀. 평평한 라우트에 억지로 붙이지 않음. */
export function createBreadcrumbSchema(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: `${BASE_URL}${path}`,
    })),
  };
}
