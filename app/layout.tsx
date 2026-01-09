import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { ViewTransitions } from "next-view-transitions";
import { GoogleAnalytics } from "@next/third-parties/google";
import { BottomNavigation, Content, DefaultLayout, Header } from "@/layouts";
import QueryProvider from "@/components/provider/QueryProvider";
import { Initializer } from "@/components";
import "./globals.css";


// 1. Viewport
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  interactiveWidget: "resizes-content"
};

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_TITLE || "Only Bitcoin",
  description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기(BTC/KRW/USD/SAT), Not your keys, not your Bitcoin",
  keywords: ["비트코인", "온리 비트코인", "비트코인 계산기", "사토시 계산기", "비트코인 밈"],
  authors: [{ name: "a7w2en7z_" }],
  verification: {
    google: "NcpMqZPUpri0JyCFt3SV-633FoaSsDKG4PRg2HlgqW8" // 서치 콘솔
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "온리 비트코인",
    statusBarStyle: "default"
  },
  openGraph: {
    type: "website",
    url: process.env.NEXT_PUBLIC_URL,
    title: "온리 비트코인",
    description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기",
    images: [
      {
        url: "/app/og-image.webp" // public 폴더 기준 경로
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "온리 비트코인",
    description: "온리 비트코인 시세 및 사토시, 원화 자동 계산기...",
    images: ["/app/og-image.webp"]
  },
  // 아이콘 설정
  icons: {
    icon: [
      { url: "/app/favicon-16x16.png", sizes: "16x16" },
      { url: "/app/favicon-32x32.png", sizes: "32x32" },
      { url: "/app/icon-192x192.png", sizes: "192x192" }
    ],
    apple: [
      { url: "/app/icon-128x128.png", sizes: "128x128" },
      { url: "/app/icon-152x152.png", sizes: "152x152" }
    ]
  }
};


export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {

  const isProduction = process.env.NODE_ENV === "production";

  return (
    <ViewTransitions>
      <html lang="ko">
      <body>
      {isProduction && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID || ""} />}
      <QueryProvider>
        <Initializer />
        <DefaultLayout>
          <Header />
          <Content>
            {children}
          </Content>
          <BottomNavigation />
        </DefaultLayout>
      </QueryProvider>
      </body>
      </html>
    </ViewTransitions>
  );
}
