// next.config.ts

import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const APP_VERSION = `${packageJson.version}`;

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
  async headers() {
    return [
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
