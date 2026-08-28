import { fetchPublicTreasurySnapshot } from "@/entities/treasury/server";
import TreasuryCompanyListCard from "./TreasuryCompanyListCard";
import TreasuryFetchFailedCard from "./TreasuryFetchFailedCard";
import TreasurySummaryCard from "./TreasurySummaryCard";

/** 상장기업 트레저리 데이터를 조회해 페이지의 비동기 콘텐츠를 구성한다. */
export default async function TreasuryScreen() {
  const { summary, companies, fetchedAt, hasFetchFailed } = await fetchPublicTreasurySnapshot();

  if (hasFetchFailed) {
    return <TreasuryFetchFailedCard />;
  }

  return (
    <>
      <TreasurySummaryCard summary={summary} fetchedAt={fetchedAt} />
      <TreasuryCompanyListCard companies={companies} />
    </>
  );
}
