// next.config.ts

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION = `${packageJson.version}`;

/**
 * `public/models` 파일별 내용 해시. 맵·아바타 주소 뒤 `?v=` 로 붙음.
 *
 * `/models` 는 30일 캐시라 같은 주소로 파일을 바꾸면 기존 사용자는 옛 모델을
 * 계속 받음. 맵은 전광판(코드 좌표)과 액자가 어긋나 보였고, 아바타는 다시 구운
 * 키·색이 안 바뀌어 보였음. 내용이 바뀔 때만 주소가 바뀌게 해서 캐시는 살리고
 * 새 파일은 바로 받게 함. 개발 서버는 시작할 때 한 번 구하니 다시 구우면 재시작.
 */
const MODEL_ASSET_VERSIONS = Object.fromEntries(
  readdirSync("./public/models")
    .filter((fileName) => /\.(glb|bin|webp)$/.test(fileName))
    .map((fileName) => [
      fileName,
      createHash("sha256")
        .update(readFileSync(`./public/models/${fileName}`))
        .digest("hex")
        .slice(0, 12),
    ]),
);

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

/** 스페이스 웹소켓 호스트. 주소는 채팅 시절 환경변수를 그대로 씀. */
const SPACE_CONNECT_SOURCES = toCspOrigins(process.env.NEXT_PUBLIC_CHAT_WS_URL);
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
    "https://image-store-one.vercel.app",
    "https://alternative.me",
    "https://companiesmarketcap.com",
    "https://*.googlesyndication.com",
    "https://*.doubleclick.net",
    "https://*.googleusercontent.com",
  ].join(" "),
  "font-src 'self' data:",
  [
    // blob: 은 vidstack 이 자막 트랙을 fetch() 로 읽어서 필요.
    // <track> 이라 media-src 로 착각하기 쉽지만 실제 요청은 connect-src 를 탐.
    `connect-src 'self' blob: ${SPACE_CONNECT_SOURCES} ${MEME_IMAGE_SOURCE}`,
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
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  [
    // blob: 은 SRT 를 VTT 로 변환해 만든 자막 트랙 URL 에 필요.
    "media-src 'self' blob: https://image-store-one.vercel.app",
    // 스페이스 배경음악(`spaceBgmTrack.ts`)을 배포본 밖 jsDelivr 에서 받아옴.
    // raw 는 .mp3 를 octet-stream 으로 내려 미디어로 재생되지 않음.
    "https://cdn.jsdelivr.net",
  ].join(" "),
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_MODEL_ASSET_VERSIONS: JSON.stringify(MODEL_ASSET_VERSIONS),
  },
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
      {
        /**
         * `/space` 전용 3D 에셋 — 맵·아바타·Draco 디코더.
         *
         * 일반 정적 리소스(7일)보다 **한 달**로 길게 잡는다. 콜드 로드
         * 1.7 MB 중 1.25 MB 가 이 규칙과 아래 하늘 규칙에 걸리고, 바뀔
         * 때는 파일을 다시 굽는 종류라 자주 갱신되지 않는다. 확장자
         * 목록에 `glb`·`bin`·`wasm` 이 빠져 있어 원래는 `max-age=0` 으로
         * 나가고 있었다.
         */
        source: "/:dir(models|draco)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        /**
         * 360° 파노라마 하늘. 콜드 로드에서 가장 큰 단일 파일(575 KB)이다.
         *
         * **위의 일반 이미지 규칙보다 뒤에 와야 한다.** `webp` 라 양쪽에
         * 걸리는데, Next 는 같은 헤더 키를 **뒤에 선언한 규칙으로 덮어쓴다.**
         * 앞에 뒀더니 일반 규칙의 7일이 이겼다.
         */
        source: "/images/360.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
