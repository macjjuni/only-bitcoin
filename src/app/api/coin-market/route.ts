import { fetchCoinMarketSnapshot } from "@/entities/coin-market/server";

/** 히트맵 페이지와 같은 서버 조회·캐시를 전광판에서도 사용함. 실패 응답은 캐시하지 않음. */
export async function GET(): Promise<Response> {
  const snapshot = await fetchCoinMarketSnapshot();

  return Response.json(snapshot, {
    status: snapshot.hasFetchFailed ? 503 : 200,
    headers: {
      "Cache-Control": snapshot.hasFetchFailed ? "no-store" : "public, max-age=0, s-maxage=300",
    },
  });
}
