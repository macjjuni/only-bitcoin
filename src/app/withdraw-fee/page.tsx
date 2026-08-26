import { WITHDRAW_FEE_VERIFIED_AT } from "@/entities/exchange";
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
  "업비트·빗썸·코빗·바이낸스·크라켄의 비트코인 출금 수수료와 지원 네트워크를 한눈에 비교해 보세요.";

/**
 * 12시간. 거래소 페처의 `WITHDRAW_REVALIDATE_SECONDS` 와 같은 값으로 맞출 것.
 *
 * Next 가 이 export 를 정적으로 읽어야 해서 상수를 import 해 쓸 수 없음.
 * 여기가 더 짧으면 표의 "업데이트" 시각만 갱신되고 수수료는 그대로라 어긋남.
 */
export const revalidate = 43_200;

export const metadata = createPageMetadata({
  path: "/withdraw-fee",
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
});

export default async function WithdrawFeePage() {
  const snapshot = await fetchExchangeWithdrawSnapshot();

  return (
    <PageLayout className="gap-2.5">
      <JsonLd schema={createFaqSchema(WITHDRAW_FEE_FAQ)} />
      <PageTitle
        label="Withdraw Fee"
        title={HEADING}
        description="출금 수수료와 최소 출금 수량을 한눈에 비교해 보세요."
      />
      {/* BTC 원화 환산액은 소켓 시세로 클라이언트에서 계산됨. 서버는 수량만 내려줌. */}
      <WithdrawFeePanel
        exchanges={snapshot.exchanges}
        rows={snapshot.rows}
        usdtKrwPrice={snapshot.usdtKrwPrice}
        fetchedAt={snapshot.fetchedAt}
        verifiedAt={WITHDRAW_FEE_VERIFIED_AT}
      />
      <WithdrawFeeGuideArticle />
    </PageLayout>
  );
}
