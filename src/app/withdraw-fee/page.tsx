import { fetchInitialPrice } from "@/entities/bitcoin/server";
import { fetchInitialBlocks } from "@/entities/block/server";
import { USDT_KRW_FALLBACK_PRICE, WITHDRAW_FEE_VERIFIED_AT } from "@/entities/exchange";
import { fetchExchangeWithdrawSnapshot } from "@/entities/exchange/server";
import { createFaqSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { WITHDRAW_FEE_FAQ, WithdrawFeeGuideArticle, WithdrawFeePanel } from "@/views/withdraw-fee";

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

  return (
    <PageLayout className="gap-2.5">
      <JsonLd schema={createFaqSchema(WITHDRAW_FEE_FAQ)} />
      <PageTitle
        label="Withdraw Fee"
        title={HEADING}
        description="국내 거래소가 실제 네트워크 비용의 몇 배를 받는지 확인해 보세요."
      />
      {/* 배율은 소켓 값으로 계속 다시 계산됨. 여기 값은 초기 표시용. */}
      <WithdrawFeePanel
        exchanges={snapshot.exchanges}
        rows={snapshot.rows}
        usdtKrwPrice={snapshot.usdtKrwPrice ?? USDT_KRW_FALLBACK_PRICE}
        fetchedAt={snapshot.fetchedAt}
        verifiedAt={WITHDRAW_FEE_VERIFIED_AT}
        initialFeeRate={fees.halfHourFee}
        initialBtcKrwPrice={initialPrice.krw}
      />
      <WithdrawFeeGuideArticle />
    </PageLayout>
  );
}
