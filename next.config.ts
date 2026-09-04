// next.config.ts

import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION = `${packageJson.version}`;

const CHAT_CONNECT_SOURCES = [
  process.env.NEXT_PUBLIC_CHAT_API_URL,
  process.env.NEXT_PUBLIC_CHAT_WS_URL,
]
  .filter((source): source is string => Boolean(source))
  .map((source) => new URL(source).origin)
  .join(" ");
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "https://challenges.cloudflare.com",
    "https://www.googletagmanager.com",
    "https://pagead2.googlesyndication.com",
    "https://tpc.googlesyndication.com",
    "https://adservice.google.com",
    "https://ep1.adtrafficquality.google",
    "https://ep2.adtrafficquality.google",
  ].join(" "),
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    "https://raw.githubusercontent.com",
    "https://bitcoin.org",
    "https://image-store-one.vercel.app",
    "https://alternative.me",
    "https://*.googlesyndication.com",
    "https://*.doubleclick.net",
    "https://*.googleusercontent.com",
  ].join(" "),
  "font-src 'self' data:",
  [
    `connect-src 'self' ${CHAT_CONNECT_SOURCES}`,
    "https://challenges.cloudflare.com",
    // 애널리틱스·광고 비콘
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googlesyndication.com",
    "https://*.doubleclick.net",
    "https://*.adtrafficquality.google",
    // 시세·차트 REST
    "https://api.binance.com",
    "https://api.blockchain.info",
    "https://api.coingecko.com",
    "https://api.upbit.com",
    "https://api.bithumb.com",
    "https://api.alternative.me",
    "https://mempool.space",
    "https://m.search.naver.com",
    // 실시간 스트림. 포트를 생략하면 CSP 가 기본 포트(443)만 허용하므로 9443 을 명시한다.
    "wss://stream.binance.com:9443",
    "wss://api.upbit.com",
    "wss://ws-api.bithumb.com",
    "wss://ws-feed.exchange.coinbase.com",
    "wss://advanced-trade-ws.coinbase.com",
    "wss://mempool.space",
  ].join(" "),
  "frame-src 'self' https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  "media-src 'self' https://image-store-one.vercel.app",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  allowedDevOrigins: ["192.168.68.*"],
  devIndicators: false,
  images: {
    /**
     * 최적화 이미지 캐시 수명 7일.
     *
     * GitHub raw 는 `max-age=300` 만 내려주는데 그 헤더는 우리가 못 고친다.
     * 최적화기가 `max(minimumCacheTTL, 업스트림 max-age)` 로 만료를 정하므로
     * 이 값이 실질적인 캐시 수명이 된다. ( 응답은 `public, max-age=604800, must-revalidate` )
     * 건물 사진은 바뀌지 않으니 300 초마다 다시 받을 이유가 없다.
     */
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // 단지 사진은 저장소에 두고 GitHub raw 로 받는다. ( 배포본 용량에서 제외 )
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/macjjuni/only-bitcoin/**",
      },
    ],
  },
  /**
   * `/orange-pill` 경로를 `/orange` 로 옮기면서 남긴 리다이렉트.
   *
   * 기존 링크·북마크·검색엔진 색인이 살아 있으니 308 로 영구 이전을 알린다.
   * ( `permanent: true` = 308, 메서드와 본문을 보존하면서 색인도 새 URL 로 넘김 )
   * 밈·BIP39 는 `/orange` 하위가 아니라 최상위로 빠졌으므로
   * 더 넓은 `:path*` 규칙보다 먼저 둬야 한다. ( 위에서부터 순서대로 매칭됨 )
   */
  async redirects() {
    return [
      {
        source: "/orange-pill/meme",
        destination: "/meme",
        permanent: true,
      },
      {
        source: "/orange-pill/bip39",
        destination: "/bip39",
        permanent: true,
      },
      {
        // `:path*` 는 0개 세그먼트도 매칭하므로 `/orange-pill` 자체도 함께 처리된다.
        source: "/orange-pill/:path*",
        destination: "/orange/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
      {
        // public 폴더 내 정적 리소스 (이미지, 파비콘, 폰트, 매니페스트 등)
        source: "/:all*(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|manifest.json)",
        headers: [
          {
            key: "Cache-Control",
            // 7일 동안 브라우저 및 CDN 캐시 사용, 만료 후 백그라운드 재검증 (stale-while-revalidate 1일)
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
