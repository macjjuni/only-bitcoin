import { WITHDRAW_FEE_VERIFIED_AT } from "@/entities/exchange";
import { fetchExchangeWithdrawSnapshot } from "@/entities/exchange/server";
import WithdrawFeePanel from "./WithdrawFeePanel";

/** 거래소별 출금 조건을 서버에서 조회해 비교 패널을 구성한다. */
export default async function WithdrawFeeScreen() {
  const snapshot = await fetchExchangeWithdrawSnapshot();

  return (
    <WithdrawFeePanel
      exchanges={snapshot.exchanges}
      rows={snapshot.rows}
      fetchedAt={snapshot.fetchedAt}
      verifiedAt={WITHDRAW_FEE_VERIFIED_AT}
    />
  );
}
