import { fetchInitialPrice } from "@/entities/bitcoin/server";
import { fetchInitialBlocks } from "@/entities/block/server";
import { WITHDRAW_FEE_VERIFIED_AT } from "@/entities/exchange";
import { fetchExchangeWithdrawSnapshot } from "@/entities/exchange/server";
import { createFaqSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import {
  buildOnChainFeeReference,
  buildWithdrawFeeComparison,
  ExchangeFeeList,
  WITHDRAW_FEE_FAQ,
  WithdrawFeeGuideArticle,
  WithdrawFeeSummaryCard,
} from "@/views/withdraw-fee";

const PAGE_TITLE = "거래소 비트코인 출금 수수료";
/** 화면에 보이는 제목. 메타 타이틀은 검색어를 더 담아야 해서 따로 둠. */
const HEADING = "거래소별 출금 수수료";
const PAGE_DESCRIPTION =
  "업비트·빗썸의 비트코인 출금 수수료를 실시간 온체인 수수료와 비교해 보세요. 거래소가 실제 네트워크 비용의 몇 배를 받는지 확인할 수 있습니다.";

export const metadata = createPageMetadata({
  path: "/withdraw-fee",
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
});

export default async function WithdrawFeePage() {
  const [snapshot, initialPrice, { fees }] = await Promise.all([
    fetchExchangeWithdrawSnapshot(),
    fetchInitialPrice(),
    fetchInitialBlocks(),
  ]);

  // 30분 내 확정 기준. 가장 빠른 값을 쓰면 실비가 부풀어 비교가 거래소에 유리해짐.
  const onChain = buildOnChainFeeReference(fees.halfHourFee, initialPrice.krw);
  const comparisons = snapshot.exchanges.map((exchange) =>
    buildWithdrawFeeComparison(exchange, onChain, initialPrice.krw),
  );
  // 정렬이 수수료 오름차순이라 마지막이 가장 비싼 곳. 대표 숫자로 씀.
  const worst = comparisons[comparisons.length - 1];
  // 다 같은 금액이면 특정 거래소를 지목하지 않고 총칭으로 부름.
  const isEveryFeeSame = comparisons.every(
    (item) => item.exchangeFeeInSats === comparisons[0]?.exchangeFeeInSats,
  );
  const subjectLabel = isEveryFeeSame ? "국내 거래소" : (worst?.exchange.name ?? "거래소");

  return (
    <PageLayout className="gap-2.5">
      <JsonLd schema={createFaqSchema(WITHDRAW_FEE_FAQ)} />
      <PageTitle
        label="Withdraw Fee"
        title={HEADING}
        description="국내 거래소가 실제 네트워크 비용의 몇 배를 받는지 확인해 보세요."
      />
      {worst && (
        <WithdrawFeeSummaryCard onChain={onChain} worst={worst} subjectLabel={subjectLabel} />
      )}
      <ExchangeFeeList
        comparisons={comparisons}
        fetchedAt={snapshot.fetchedAt}
        verifiedAt={WITHDRAW_FEE_VERIFIED_AT}
      />
      <WithdrawFeeGuideArticle />
    </PageLayout>
  );
}
