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
