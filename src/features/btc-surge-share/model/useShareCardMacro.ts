"use client";

import { useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useBitcoinDominanceQuery, useFearGreedIndex } from "@/entities/bitcoin/client";
import { calcPremiumPercent } from "@/shared/utils/calculate";

/** 값을 아직 못 받았을 때 수치 자리에 두는 표기 */
const EMPTY_VALUE_TEXT = "-";

export interface ShareCardMacroItem {
  id: string;
  label: string;
  /** 수치 문자열. 아직 받지 못했으면 `-` */
  valueText: string;
  /** 수치 뒤에 작게 붙는 단위. 값이 없으면 `null` */
  sign: string | null;
}

/**
 * 오버뷰 매크로 위젯과 같은 지표를 공유 카드용 문자열로 만든다.
 *
 * 값이 0 인 상태는 "소켓·쿼리가 아직 안 채움" 과 구분되지 않으므로 그대로 `-` 로 본다.
 * ( 도미넌스 0% · 환율 0원 · 수수료 0 sat/vB 는 실제로는 나올 수 없는 값이다 )
 */
function formatMacroValue(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return EMPTY_VALUE_TEXT;
  }

  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 공유 카드 하단에 깔리는 매크로 지표 4종.
 *
 * 오버뷰 화면의 위젯 순서( `macroSequence` )는 view 레이어 상태라 feature 에서 참조할 수 없으므로,
 * 카드에는 오버뷰의 기본 위젯 구성과 같은 4종을 같은 순서로 고정해 싣는다.
 * 데이터는 전부 `Initializer` 가 전역에서 채우는 스토어 · 공용 쿼리에서 가져오므로
 * 오버뷰 페이지 밖에서 카드를 열어도 동일하게 채워진다.
 */
export function useShareCardMacro(): ShareCardMacroItem[] {
  // region [Hooks]
  const { krw, usd } = useBitcoinStore((state) => state.bitcoinPrice);
  const usdExRate = useBitcoinStore((state) => state.exRate.value);
  // endregion

  // region [Transactions]
  const dominance = useBitcoinDominanceQuery();
  const fearGreedIndex = useFearGreedIndex();
  // endregion

  // region [Privates]
  /** 환율이 없으면 프리미엄이 100% 로 튀므로 세 값이 모두 채워진 뒤에만 계산한다. */
  const premium = useMemo(() => {
    if (!krw || !usd || !usdExRate) {
      return 0;
    }

    return calcPremiumPercent(krw, usd, usdExRate);
  }, [krw, usd, usdExRate]);
  // endregion

  return useMemo(
    () => [
      { id: "dominance", label: "BTC.D", valueText: formatMacroValue(dominance, 1), sign: "%" },
      {
        id: "usd-ex-rate",
        label: "KRW/USD",
        valueText: formatMacroValue(usdExRate, 1),
        sign: null,
      },
      { id: "premium", label: "Premium", valueText: formatMacroValue(premium, 2), sign: "%" },
      {
        id: "fear-greed",
        label: "F&G Index",
        valueText: formatMacroValue(fearGreedIndex, 0),
        sign: null,
      },
    ],
    [dominance, usdExRate, premium, fearGreedIndex],
  );
}
