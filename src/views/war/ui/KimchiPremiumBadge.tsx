import type { ReactNode } from "react";

interface KimchiPremiumBadgeProps {
  /** 김치 프리미엄(%). 계산할 수 없으면 `null`. */
  premiumPercent: number | null;
}

/**
 * 김치 프리미엄 배지.
 *
 * 국내 원화 시세가 해외 달러 시세보다 얼마나 비싼지를 부호와 함께 보여 준다.
 * 옆의 평균가는 매수·매도 압력 색을 따르지만, 이 배지는 프리미엄 자체의 부호를 따른다.
 * 둘의 색이 다른 뜻이라 배지에는 `김프` 라벨을 붙여 무엇의 색인지 못 헷갈리게 한다.
 */
export function KimchiPremiumBadge({ premiumPercent }: KimchiPremiumBadgeProps): ReactNode {
  if (premiumPercent === null) {
    return null;
  }

  const isPremiumPositive = premiumPercent > 0;
  const isPremiumNegative = premiumPercent < 0;
  const signPrefix = isPremiumPositive ? "+" : "";

  let premiumColorClass = "bg-neutral-400/15 text-muted-foreground";

  if (isPremiumPositive) {
    premiumColorClass = "bg-up/15 text-up";
  }

  if (isPremiumNegative) {
    premiumColorClass = "bg-down/15 text-down";
  }

  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${premiumColorClass}`}
    >
      프리미엄 {signPrefix}
      {premiumPercent.toFixed(2)}%
    </span>
  );
}
