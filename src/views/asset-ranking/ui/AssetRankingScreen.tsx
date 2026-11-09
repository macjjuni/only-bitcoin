import { connection } from "next/server";
import { fetchAssetRankingSnapshot } from "@/entities/asset-ranking/server";
import AssetRankingSummary from "./AssetRankingSummary";
import AssetRankingTable from "./AssetRankingTable";

export default async function AssetRankingScreen() {
  // region [Transactions]
  // 외부 수집은 빌드가 아닌 요청 시점에 시작한다. 정상 스냅샷은 별도의 Data Cache에 남는다.
  await connection();
  const snapshot = await fetchAssetRankingSnapshot();
  // endregion

  return (
    <>
      <AssetRankingSummary snapshot={snapshot} />
      <AssetRankingTable assets={snapshot.assets} />
    </>
  );
}
