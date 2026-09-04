import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Only Bitcoin",
    short_name: "Only Bitcoin",
    description: "비트코인 시세와 데이터를 확인하는 온리 비트코인",
    lang: "ko-KR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#000000",
    background_color: "#000000",
    icons: [
      {
        src: "/app/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/app/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
