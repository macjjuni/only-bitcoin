import type { ExchangeId, WithdrawAsset, WithdrawNetworkRow } from "@/entities/exchange";

const SATOSHI_PER_BTC = 100_000_000;

/**
 * 비교 기준으로 삼는 트랜잭션 크기(vB).
 *
 * 입력 1개 · 출력 2개인 P2WPKH(SegWit) 송금의 대략적인 크기임.
 * 거래소는 여러 건을 묶어 보내므로 실제 실비는 이보다 작을 수 있고,
 * 입력이 많은 지갑에서 보내면 더 클 수 있음. **어디까지나 감을 잡기 위한 기준값.**
 */
export const REFERENCE_TX_VBYTES = 141;

/**
 * 최소 릴레이 수수료율(sat/vB).
 *
 * 노드 기본 설정상 이보다 낮은 수수료의 트랜잭션은 전파되지 않는다. 멤풀이 비면
 * `fees/precise` 가 1 미만(예: 0.607)을 주는데, 그 값을 그대로 실비로 삼으면
 * **실제로는 보낼 수 없는 금액**이 기준이 되어 거래소와의 배율이 과장된다.
 */
export const MINIMUM_RELAY_FEE_RATE = 1;

export interface OnChainFeeReference {
  /** 기준 수수료율(sat/vB). */
  feeRate: number;
  /** 기준 트랜잭션 1건의 실비(사토시). */
  feeInSats: number;
  /** 그 실비의 원화 환산액. */
  feeInKrw: number;
}

/** 표의 한 칸. 거래소가 그 망을 지원하지 않으면 아예 없음. */
export interface WithdrawCell {
  withdrawFeeInAsset: number;
  withdrawFeeInKrw: number;
  minimumWithdraw: number | null;
  isWithdrawAvailable: boolean | null;
  suspensionMessage: string | null;
  /** BTC 온체인 행에서만 계산됨. 다른 망은 비교 기준이 달라 의미가 없음. */
  multipleOfOnChainFee: number | null;
}

/** 표의 한 행. */
export interface WithdrawComparisonRow {
  asset: WithdrawAsset;
  networkName: string;
  cells: Partial<Record<ExchangeId, WithdrawCell>>;
}

const satsToKrw = (sats: number, btcKrwPrice: number) => (sats / SATOSHI_PER_BTC) * btcKrwPrice;

/**
 * 온체인 실비 기준값을 만듦.
 *
 * `feeRate` 는 30분 내 확정 기준(`halfHourFee`)을 전제로 함. 가장 빠른 값을 쓰면
 * 실비가 부풀어 비교가 거래소에 유리해지고, 최저값을 쓰면 반대로 과장되므로 중간값을 씀.
 */
export function buildOnChainFeeReference(
  feeRate: number,
  btcKrwPrice: number,
): OnChainFeeReference {
  // 전파 가능한 최저선으로 바닥을 깔아야 "실제로 낼 수 있는 금액" 이 됨.
  const effectiveFeeRate = Math.max(feeRate, MINIMUM_RELAY_FEE_RATE);
  const feeInSats = Math.round(effectiveFeeRate * REFERENCE_TX_VBYTES);

  return {
    feeRate: effectiveFeeRate,
    feeInSats,
    feeInKrw: satsToKrw(feeInSats, btcKrwPrice),
  };
}

interface BuildComparisonParams {
  rows: WithdrawNetworkRow[];
  onChain: OnChainFeeReference;
  btcKrwPrice: number;
  usdtKrwPrice: number;
}

/** 자산별 원화 단가. */
const resolveAssetKrwPrice = (asset: WithdrawAsset, btcKrwPrice: number, usdtKrwPrice: number) =>
  asset === "BTC" ? btcKrwPrice : usdtKrwPrice;

/** 서버가 만든 행에 원화 환산과 배율을 붙임. */
export function buildComparisonRows({
  rows,
  onChain,
  btcKrwPrice,
  usdtKrwPrice,
}: BuildComparisonParams): WithdrawComparisonRow[] {
  return rows.map(({ asset, networkName, options }) => {
    const assetKrwPrice = resolveAssetKrwPrice(asset, btcKrwPrice, usdtKrwPrice);
    // 배율은 BTC 온체인 행에서만 뜻이 있음. 트론 USDT 를 비트코인 실비와 견주면 헛수가 됨.
    const isOnChainBitcoin = asset === "BTC" && networkName === "Bitcoin";
    const cells: WithdrawComparisonRow["cells"] = {};

    for (const [exchangeId, option] of Object.entries(options)) {
      const withdrawFeeInKrw = option.withdrawFee * assetKrwPrice;

      cells[exchangeId as ExchangeId] = {
        withdrawFeeInAsset: option.withdrawFee,
        withdrawFeeInKrw,
        minimumWithdraw: option.minimumWithdraw,
        isWithdrawAvailable: option.isWithdrawAvailable,
        suspensionMessage: option.suspensionMessage,
        multipleOfOnChainFee:
          isOnChainBitcoin && onChain.feeInKrw > 0 ? withdrawFeeInKrw / onChain.feeInKrw : null,
      };
    }

    return { asset, networkName, cells };
  });
}

/** 요약 카드용. BTC 온체인 행에서 가장 비싼 칸을 고름. */
export function findWorstBitcoinCell(comparisonRows: WithdrawComparisonRow[]) {
  const bitcoinRow = comparisonRows.find(
    (row) => row.asset === "BTC" && row.networkName === "Bitcoin",
  );
  if (!bitcoinRow) return null;

  const entries = Object.entries(bitcoinRow.cells);
  if (entries.length === 0) return null;

  return entries.reduce((worst, current) =>
    current[1].withdrawFeeInKrw > worst[1].withdrawFeeInKrw ? current : worst,
  );
}
