import { MetadataRoute } from "next";

const BASE_URL = "https://only-btc.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // #region 1. Static Routes
  const staticRoutes = [
    "",
    "/overview",
    "/blocks",
    "/btc2fiat",
    "/premium",
    "/orange-pill",
    "/orange-pill/meme",
    "/orange-pill/bip39",
    "/settings"
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));
  // #endregion

  // #region 2. Dynamic Routes (예: 비트코인 관련 동적 페이지)
  // 실제 API 호출이나 DB 조회 코드가 들어가는 부분입니다.
  // const dynamicRoutes = await fetchDynamicCoinRoutes();
  // #endregion

  return staticRoutes;
}

// // #region Helper Functions
// async function fetchDynamicCoinRoutes() {
//   // 예시: API를 통해 코인 목록을 가져와서 상세 페이지 경로 생성
//   // const coins = await fetch('https://api.example.com/coins').then(res => res.json());
//   const exampleCoins = ['bitcoin', 'ethereum', 'solana'];
//
//   return exampleCoins.map((coinId) => ({
//     url: `${BASE_URL}/coin/${coinId}`,
//     lastModified: new Date(),
//     changeFrequency: 'hourly' as const,
//     priority: 0.6,
//   }));
// }
// // #endregion