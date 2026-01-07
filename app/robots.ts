import { MetadataRoute } from 'next';

const BASE_URL = "https://only-btc.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      // 모든 검색 로봇에게 적용
      userAgent: '*',
      // 모든 페이지 탐색 허용
      allow: '/',
      // 검색 엔진에 노출하고 싶지 않은 경로 (예: 설정 페이지, 관리자 페이지)
      disallow: ['/settings'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}