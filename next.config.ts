// next.config.ts

import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION = `${packageJson.version}`;

/**
 * 환경변수 URL 에서 CSP 소스로 쓸 origin 만 뽑음.
 *
 * 잘못된 값은 빌드를 세우지 않고 건너뜀. CSP 한 줄 때문에 배포 전체가
 * 막히는 것보다 해당 호스트만 차단되는 편이 나음.
 */
const toCspOrigins = (...urlValues: Array<string | undefined>): string => {
  return urlValues
    .filter((urlValue): urlValue is string => Boolean(urlValue))
    .map((urlValue) => {
      try {
        return new URL(urlValue).origin;
      } catch {
        console.warn(`[CSP] origin 을 해석하지 못해 건너뜁니다: ${urlValue}`);
        return "";
      }
    })
    .filter(Boolean)
    .join(" ");
};

const CHAT_CONNECT_SOURCES = toCspOrigins(
  process.env.NEXT_PUBLIC_CHAT_API_URL,
  process.env.NEXT_PUBLIC_CHAT_WS_URL,
);
/** 밈 이미지 호스트. 갤러리는 <img>, 저장·복사는 fetch 라 img-src 와 connect-src 양쪽에 필요. */
const MEME_IMAGE_SOURCE = toCspOrigins(process.env.NEXT_PUBLIC_MEME_IMAGE_URL);
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
    `img-src 'self' data: blob: ${MEME_IMAGE_SOURCE}`,
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
    // blob: 은 vidstack 이 자막 트랙을 fetch() 로 읽어서 필요.
    // <track> 이라 media-src 로 착각하기 쉽지만 실제 요청은 connect-src 를 탐.
    `connect-src 'self' blob: ${CHAT_CONNECT_SOURCES} ${MEME_IMAGE_SOURCE}`,
    "https://challenges.cloudflare.com",
    // 제네시스 영상 자막(.srt)을 fetch 로 받아 VTT 로 변환함.
    "https://image-store-one.vercel.app",
    // html-to-image 가 공유 카드의 단지 사진을 인라인하려고 직접 받아옴.
    "https://raw.githubusercontent.com",
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
    // 실시간 스트림. 포트를 생략하면 CSP 가 기본 포트(443)만 허용해서 9443 을 명시함.
    "wss://stream.binance.com:9443",
    "wss://api.upbit.com",
    "wss://ws-api.bithumb.com",
    "wss://ws-feed.exchange.coinbase.com",
    "wss://advanced-trade-ws.coinbase.com",
    "wss://mempool.space",
  ].join(" "),
  "frame-src 'self' https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  // blob: 은 SRT 를 VTT 로 변환해 만든 자막 트랙 URL 에 필요.
  "media-src 'self' blob: https://image-store-one.vercel.app",
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
     * GitHub raw 는 `max-age=300` 만 내려주고 그 헤더는 못 고침. 최적화기가
     * `max(minimumCacheTTL, 업스트림 max-age)` 로 만료를 정해서 이 값이 실질적인
     * 캐시 수명이 됨. ( 응답은 `public, max-age=604800, must-revalidate` )
     * 건물 사진은 안 바뀌니 300 초마다 다시 받을 이유 없음.
     */
    minimumCacheTTL: 60 * 60 * 24 * 7,
    // 단지 사진은 저장소에 두고 GitHub raw 로 받아옴. ( 배포본 용량에서 제외 )
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
   * 기존 링크·북마크·검색엔진 색인이 살아 있어서 308 로 영구 이전을 알림.
   * ( `permanent: true` = 308, 메서드와 본문을 보존하면서 색인도 새 URL 로 넘김 )
   * 밈·BIP39 는 `/orange` 하위가 아니라 최상위로 빠져서
   * 더 넓은 `:path*` 규칙보다 먼저 둬야 함. ( 위에서부터 순서대로 매칭됨 )
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
        // `:path*` 는 0개 세그먼트도 매칭해서 `/orange-pill` 자체도 같이 처리됨.
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
