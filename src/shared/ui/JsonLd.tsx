import { serializeJsonLd } from "@/shared/config/jsonLd";

interface JsonLdProps {
  /** `@/shared/config/jsonLd` 의 빌더가 만든 스키마. */
  schema: object;
}

/**
 * 구조화 데이터를 `<script type="application/ld+json">` 으로 심음.
 *
 * 서버 컴포넌트로 두어야 SSR HTML 에 그대로 들어감. `"use client"` 를 붙이지 말 것.
 */
export default function JsonLd({ schema }: JsonLdProps) {
  return (
    // JSON-LD 는 스크립트 본문으로만 넣을 수 있음. serializeJsonLd 가 `<` 를 이스케이프함.
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
