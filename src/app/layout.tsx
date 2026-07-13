import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { ViewTransitions } from "next-view-transitions";
import type { ReactNode } from "react";
import Initializer from "@/app/initializers/Initializer";
import QueryProvider from "@/app/providers/QueryProvider";
import { env } from "@/shared/config/env";
import { THEME_INITIALIZATION_SCRIPT } from "@/shared/config/theme";
import { ConfettiEffect } from "@/shared/ui";
import { Content, DefaultLayout } from "@/shared/ui/layout";
import { BottomNavigation } from "@/widgets/bottom-navigation";
import { Header } from "@/widgets/header";
import "./globals.css";

// 1. Viewport
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_URL),
  title: env.NEXT_PUBLIC_TITLE,
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
  openGraph: {
    type: "website",
    url: env.NEXT_PUBLIC_URL,
    title: "온리 비트코인",
    description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기",
    images: [
      {
        url: "/app/og-image.webp", // public 폴더 기준 경로
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "온리 비트코인",
    description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기...",
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
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
              crossOrigin="anonymous"
            />
          )}
          <script dangerouslySetInnerHTML={{ __html: THEME_INITIALIZATION_SCRIPT }} />
        </head>
        <body>
          {isProduction && <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_TRACKING_ID} />}
          <QueryProvider>
            <Initializer />
            <DefaultLayout>
              <Header />
              <Content>{children}</Content>
              <BottomNavigation />
            </DefaultLayout>
            <ConfettiEffect />
          </QueryProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
