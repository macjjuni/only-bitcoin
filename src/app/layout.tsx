import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ViewTransitions } from "next-view-transitions";
import type { ReactNode } from "react";
import Initializer from "@/app/initializers/Initializer";
import QueryProvider from "@/app/providers/QueryProvider";
import { env } from "@/shared/config/env";
import { organizationSchema, webSiteSchema } from "@/shared/config/jsonLd";
import { THEME_INITIALIZATION_SCRIPT } from "@/shared/config/theme";
import { ConfettiEffect, JsonLd } from "@/shared/ui";
import { Content, DefaultLayout } from "@/shared/ui/layout";
import { BottomNavigation } from "@/widgets/bottom-navigation";
import { GlobalFloatingBanner } from "@/widgets/floating-banner";
import { Header } from "@/widgets/header";
import "./globals.css";

// 1. Viewport
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 다크 모드에서도 흰색을 물고 있으면 상단 시스템 바만 하얗게 떠서 테마별로 나눔.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_URL),
  // 하위 페이지는 고유 제목만 넘기고 브랜드 접미사는 템플릿이 붙임.
  title: { default: env.NEXT_PUBLIC_TITLE, template: `%s | ${env.NEXT_PUBLIC_TITLE}` },
  description:
    "온리 비트코인 시세 및 사토시, 원화 자동 계산기(BTC/KRW/USD/SAT), Not your keys, not your Bitcoin",
  keywords: ["비트코인", "온리 비트코인", "비트코인 계산기", "사토시 계산기", "비트코인 밈"],
  authors: [{ name: "a7w2en7z_" }],
  verification: {
    google: "nEjgqK7F-A9Ldgevt4Jjz1ekaTutFoUx8FEkUcaTfPE", // 서치 콘솔
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "온리 비트코인",
    statusBarStyle: "default",
  },
  /**
   * `url` 을 여기서 고정하면 자체 `openGraph` 가 없는 페이지가 전부 홈 URL 을 물고 감.
   * 페이지별 `og:url` 은 `createPageMetadata` 가 채우므로 루트에서는 잡지 않음.
   */
  openGraph: {
    type: "website",
    siteName: env.NEXT_PUBLIC_TITLE,
    title: { default: "온리 비트코인", template: `%s | ${env.NEXT_PUBLIC_TITLE}` },
    description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기",
    images: [
      {
        url: "/app/og-image.webp", // public 폴더 기준 경로
        width: 1024, // 실제 파일 크기와 맞춤
        height: 559,
        alt: "온리 비트코인 - 비트코인 시세와 계산기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: { default: "온리 비트코인", template: `%s | ${env.NEXT_PUBLIC_TITLE}` },
    description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기",
    images: ["/app/og-image.webp"],
  },
  // 아이콘 설정
  icons: {
    icon: [
      { url: "/app/favicon-16x16.png", sizes: "16x16" },
      { url: "/app/favicon-32x32.png", sizes: "32x32" },
      { url: "/app/icon-192x192.png", sizes: "192x192" },
    ],
    apple: [
      { url: "/app/icon-128x128.png", sizes: "128x128" },
      { url: "/app/icon-152x152.png", sizes: "152x152" },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <ViewTransitions>
      <html lang="ko" suppressHydrationWarning>
        <head>
          {isProduction && env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
            <Script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          )}
          <Script
            id="theme-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: THEME_INITIALIZATION_SCRIPT }}
          />
        </head>
        <body>
          {/* 브랜드·사이트 실체. 전 페이지 공통이라 루트에 한 번만 심음. */}
          <JsonLd schema={organizationSchema} />
          <JsonLd schema={webSiteSchema} />
          {isProduction && env.NEXT_PUBLIC_GTM_ID && (
            <GoogleTagManager gtmId={env.NEXT_PUBLIC_GTM_ID} />
          )}
          {isProduction && env.NEXT_PUBLIC_GA_TRACKING_ID && (
            <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_TRACKING_ID} />
          )}
          <QueryProvider>
            <Initializer />
            <DefaultLayout>
              <Header />
              <Content>{children}</Content>
              <BottomNavigation />
              <GlobalFloatingBanner />
            </DefaultLayout>
            <ConfettiEffect />
          </QueryProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
