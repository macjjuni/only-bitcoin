import type { MetadataRoute } from "next";
import { ARCHIVE_GENERATED_AT } from "@/entities/apartment/server";
import { env } from "@/shared/config/env";
import { PRIVACY_EFFECTIVE_DATE } from "@/shared/constants/policy";

const BASE_URL = env.NEXT_PUBLIC_URL;

/**
 * 도구·읽을거리 페이지의 내용이 마지막으로 바뀐 날.
 *
 * `new Date()` 를 쓰면 배포할 때마다 전 페이지가 "방금 수정됨" 으로 나가고,
 * 그게 반복되면 구글이 이 사이트의 lastmod 를 아예 신뢰하지 않게 된다.
 * ( `PRIVACY_EFFECTIVE_DATE` 주석과 같은 이유 )
 *
 * **페이지 내용을 실제로 손봤을 때만 갱신한다.** 배포 때마다 만지지 않는다.
 */
const CONTENT_UPDATED_AT = "2026-08-26" as const;

/**
 * 시세·블록·수수료처럼 표시되는 값 자체가 계속 바뀌는 페이지.
 * 여기만 배포 시각을 lastmod 로 써도 거짓이 아니다.
 */
const LIVE_ROUTES = [
  "/overview",
  "/blocks",
  "/blocks/countdown",
  "/btc2fiat",
  "/premium",
  "/treasury",
  "/etf",
  "/withdraw-fee",
] as const;

/** 코드를 고쳐야 내용이 바뀌는 도구·읽을거리 페이지. */
const STATIC_ROUTES = ["/dca", "/cagr", "/solo-mining", "/orange", "/meme", "/bip39"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // #region 1. 실시간 데이터 페이지
  // `/`는 `/overview`로 리다이렉트하므로 정규 URL만 제출.
  // `/settings` 는 페이지 자체에 noindex 를 달았으므로 제출하지 않음.
  const liveRoutes = LIVE_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: route === "/overview" ? 1.0 : 0.8,
  }));
  // #endregion

  // #region 2. 도구·읽을거리 페이지
  const staticRoutes = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(CONTENT_UPDATED_AT),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  // #endregion

  // #region 3. lastmod 를 따로 들고 있는 페이지
  // 아파트는 실거래가 아카이브가 갱신될 때만 내용이 바뀌므로 그 생성 시각을 그대로 쓴다.
  const archiveRoutes = [
    {
      url: `${BASE_URL}/btc2apartment`,
      lastModified: new Date(ARCHIVE_GENERATED_AT),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  // 정책 문서는 시행일로 고정. 갱신 주기·중요도가 시세 페이지와 다르다.
  const policyRoutes = [
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(PRIVACY_EFFECTIVE_DATE),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];
  // #endregion

  return [...liveRoutes, ...staticRoutes, ...archiveRoutes, ...policyRoutes];
}
