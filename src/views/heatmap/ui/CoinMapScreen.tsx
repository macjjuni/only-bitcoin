import { COIN_MARKET_TOP_COUNT } from "@/entities/coin-market";
import { fetchCoinMarketSnapshot } from "@/entities/coin-market/server";
import { HeatmapShareDialog } from "@/features/heatmap-share";
import { Card, CardContent } from "@/shared/ui";
import { buildCoinMapSummary } from "../lib/buildCoinMapSummary";
import { buildHeatmapShareData } from "../lib/buildHeatmapShareData";
import CoinMapCollectedAt from "./CoinMapCollectedAt";
import CoinShareListCard from "./CoinShareListCard";
import CoinTreemapCard from "./CoinTreemapCard";

/** CoinGecko 스냅샷을 받아 트리맵·목록을 그림. */
export default async function CoinMapScreen() {
  // region [Transactions]
  const snapshot = await fetchCoinMarketSnapshot();
  // endregion

  if (snapshot.hasFetchFailed) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <strong className="text-base font-bold">데이터를 불러오지 못했어요</strong>
          <p className="text-sm leading-relaxed text-muted-foreground">
            CoinGecko 응답이 없습니다. 잠시 후 다시 시도해 주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = buildCoinMapSummary(snapshot);
  const shareData = buildHeatmapShareData({
    tiles: summary.tiles,
    totalMarketCapInUsd: snapshot.totalMarketCapInUsd,
    bitcoinDominancePercent: snapshot.bitcoinDominancePercent,
    fetchedAt: snapshot.fetchedAt,
  });

  return (
    <>
      <CoinTreemapCard tiles={summary.tiles} topCount={COIN_MARKET_TOP_COUNT} />
      <CoinMapCollectedAt fetchedAt={snapshot.fetchedAt} />
      <CoinShareListCard tiles={summary.tiles} />
      {/* 공유 카드는 이 화면이 이미 가진 스냅샷을 그대로 씀. 여는 버튼은 플로팅 배너에 있음. */}
      <HeatmapShareDialog data={shareData} />
    </>
  );
}
