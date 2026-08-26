import type { ExchangeId, WithdrawAsset, WithdrawNetworkRow } from "@/entities/exchange";

/** 표의 한 칸. 거래소가 그 망을 지원하지 않으면 아예 없음. */
export interface WithdrawCell {
  withdrawFeeInAsset: number;
  /** 해당 자산의 원화 시세를 아직 못 구했으면 null. ( BTC 는 소켓이 붙기 전까지 ) */
  withdrawFeeInKrw: number | null;
  minimumWithdraw: number | null;
  minimumWithdrawInKrw: number | null;
  isWithdrawAvailable: boolean | null;
  suspensionMessage: string | null;
}

/** 표의 한 행. */
export interface WithdrawComparisonRow {
  asset: WithdrawAsset;
  networkName: string;
  cells: Partial<Record<ExchangeId, WithdrawCell>>;
}

interface BuildComparisonParams {
  rows: WithdrawNetworkRow[];
  /** 소켓 시세. 아직 안 붙었으면 0 이고, 그때는 원화 환산을 아예 하지 않음. */
  btcKrwPrice: number;
  usdtKrwPrice: number;
}

/** 자산별 원화 단가. 시세가 없으면 null. */
const resolveAssetKrwPrice = (asset: WithdrawAsset, btcKrwPrice: number, usdtKrwPrice: number) => {
  const price = asset === "BTC" ? btcKrwPrice : usdtKrwPrice;

  return price > 0 ? price : null;
};

/**
 * 서버가 만든 행에 원화 환산액을 붙임.
 *
 * BTC 시세는 SSR 로 내려받지 않고 소켓 값만 씀. 초기값을 따로 심으면 12시간 캐시된
 * 시세가 화면에 굳어 버려서, 시세가 없는 동안에는 원화 줄을 안 그리는 쪽을 택함.
 */
export function buildComparisonRows({
  rows,
  btcKrwPrice,
  usdtKrwPrice,
}: BuildComparisonParams): WithdrawComparisonRow[] {
  return rows.map(({ asset, networkName, options }) => {
    const assetKrwPrice = resolveAssetKrwPrice(asset, btcKrwPrice, usdtKrwPrice);
    const cells: WithdrawComparisonRow["cells"] = {};

    for (const [exchangeId, option] of Object.entries(options)) {
      cells[exchangeId as ExchangeId] = {
        withdrawFeeInAsset: option.withdrawFee,
        withdrawFeeInKrw: assetKrwPrice === null ? null : option.withdrawFee * assetKrwPrice,
        minimumWithdraw: option.minimumWithdraw,
        minimumWithdrawInKrw:
          assetKrwPrice === null || option.minimumWithdraw === null
            ? null
            : option.minimumWithdraw * assetKrwPrice,
        isWithdrawAvailable: option.isWithdrawAvailable,
        suspensionMessage: option.suspensionMessage,
      };
    }

    return { asset, networkName, cells };
  });
}
