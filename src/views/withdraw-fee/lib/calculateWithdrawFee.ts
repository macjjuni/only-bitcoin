import type { ExchangeWithdrawInfo } from "@/entities/exchange";

const SATOSHI_PER_BTC = 100_000_000;

/**
 * 비교 기준으로 삼는 트랜잭션 크기(vB).
 *
 * 입력 1개 · 출력 2개(받는 곳 + 잔돈)인 P2WPKH(SegWit) 송금의 대략적인 크기임.
 * 거래소 출금은 보통 여러 건을 묶어 보내므로 실제 실비는 이보다 작을 수 있고,
 * 입력이 많은 지갑에서 보내면 더 클 수 있음. **어디까지나 감을 잡기 위한 기준값.**
 */
export const REFERENCE_TX_VBYTES = 141;

/**
 * 최소 릴레이 수수료율(sat/vB).
 *
 * 노드 기본 설정상 이보다 낮은 수수료의 트랜잭션은 전파되지 않는다. 멤풀이 비면
 * `fees/precise` 가 1 미만(예: 0.607)을 주는데, 그 값을 그대로 실비로 삼으면
 * **실제로는 보낼 수 없는 금액**이 기준이 되어 거래소와의 배율이 과장된다.
 * 그래서 항상 이 값으로 바닥을 깐다.
 */
export const MINIMUM_RELAY_FEE_RATE = 1;

export interface WithdrawFeeComparison {
  exchange: ExchangeWithdrawInfo;
  /** 거래소가 떼는 수수료(사토시). */
  exchangeFeeInSats: number;
  /** 거래소 수수료의 원화 환산액. */
  exchangeFeeInKrw: number;
  /**
   * 온체인 실비의 몇 배인지.
   *
   * 실비가 0 이면(=수수료율 데이터가 아직 안 들어옴) 계산이 불가능하므로 null.
   */
  multipleOfOnChainFee: number | null;
}

export interface OnChainFeeReference {
  /** 기준 수수료율(sat/vB). */
  feeRate: number;
  /** 기준 트랜잭션 1건의 실비(사토시). */
  feeInSats: number;
  /** 그 실비의 원화 환산액. */
  feeInKrw: number;
}

/** 사토시를 원화로 환산함. */
const satsToKrw = (sats: number, btcKrwPrice: number) => (sats / SATOSHI_PER_BTC) * btcKrwPrice;

/**
 * 온체인 실비 기준값을 만듦.
 *
 * `feeRate` 는 30분 내 확정 기준(`halfHourFee`)을 넘겨받는 걸 전제로 함.
 * 가장 빠른 값을 쓰면 실비가 부풀어 비교가 거래소에 유리해지고,
 * 최저값을 쓰면 반대로 과장되므로 중간값을 씀.
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

/** 거래소 수수료를 온체인 실비와 견줌. */
export function buildWithdrawFeeComparison(
  exchange: ExchangeWithdrawInfo,
  onChain: OnChainFeeReference,
  btcKrwPrice: number,
): WithdrawFeeComparison {
  const exchangeFeeInSats = Math.round(exchange.withdrawFeeInBtc * SATOSHI_PER_BTC);

  return {
    exchange,
    exchangeFeeInSats,
    exchangeFeeInKrw: satsToKrw(exchangeFeeInSats, btcKrwPrice),
    multipleOfOnChainFee: onChain.feeInSats > 0 ? exchangeFeeInSats / onChain.feeInSats : null,
  };
}
