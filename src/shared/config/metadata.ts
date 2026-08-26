import type { Metadata } from "next";
import { env } from "@/shared/config/env";

/**
 * 기본 OG 이미지.
 *
 * `width`/`height` 는 실제 파일 크기와 반드시 같아야 함. 값이 어긋나면 카카오톡 같은
 * 일부 스크래퍼가 미리보기를 아예 안 그림. 이미지를 갈아끼우면 이 값도 같이 바꿈.
 */
const DEFAULT_OG_IMAGE = {
  url: "/app/og-image.webp",
  alt: "온리 비트코인 - 비트코인 시세와 계산기",
  width: 1024,
  height: 559,
} as const;

interface OgImage {
  /** `metadataBase` 기준 상대경로로 씀. */
  url: string;
  alt: string;
  width: number;
  height: number;
}

interface PageMetadataParams {
  /** 라우트 경로. canonical 과 og:url 에 같이 들어감. */
  path: string;
  /** 브랜드명을 뺀 페이지 고유 제목. 접미사는 루트 레이아웃 템플릿이 붙임. */
  title: string;
  description: string;
  /** 페이지 전용 OG 이미지. 없으면 기본 이미지 씀. */
  image?: OgImage;
}

/**
 * 페이지 메타데이터를 한 벌로 만들어 줌.
 *
 * Next 는 페이지에 `openGraph` 가 있으면 루트의 `openGraph` 를 병합하지 않고 통째로
 * 갈아치움. 그래서 페이지마다 손으로 쓰면 `og:image` 나 `og:url` 이 조용히 빠짐.
 * ( 실제로 `/cagr` 에서 `og:image` 가 사라져 있었음 )
 * canonical·og:url·og:image 를 여기서 한 번에 채워서 그 사고를 막음.
 */
export function createPageMetadata({
  path,
  title,
  description,
  image = DEFAULT_OG_IMAGE,
}: PageMetadataParams): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: env.NEXT_PUBLIC_TITLE,
      url: path,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}
