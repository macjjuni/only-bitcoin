import type { TradeRecord } from "@/entities/dca";

/**
 * 개발 환경에서 테스트용 더미 매매 기록을 생성한다.
 * 매수 8건 + 매도 2건으로 구성되어 현실적인 DCA 시나리오를 시뮬레이션한다.
 */
export function generateDummyTradeRecords(count: number): Omit<TradeRecord, "id">[] {
  const now = new Date();
  const records: Omit<TradeRecord, "id">[] = [];

  // 현실적인 BTC 가격 범위 (KRW): 1억 ~ 1.6억
  const basePrices = [
    100_000_000, 105_000_000, 110_000_000, 115_000_000, 120_000_000, 125_000_000, 130_000_000,
    135_000_000, 140_000_000, 145_000_000,
  ];

  // BTC 수량 (소수점 8자리)
  const btcAmounts = [0.001, 0.002, 0.0015, 0.003, 0.005, 0.001, 0.002, 0.004, 0.001, 0.0025];

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - i) * 7); // 7일 간격

    const isSell = i === 4 || i === 8; // 5번째, 9번째를 매도로

    records.push({
      type: isSell ? "sell" : "buy",
      btcCount: btcAmounts[i % btcAmounts.length],
      price: basePrices[i % basePrices.length] + Math.floor(Math.random() * 5_000_000),
      date: formatDate(date),
      memo: isSell ? "일부 수익 실현" : `${i + 1}차 적립식 매수`,
    });
  }

  return records;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
