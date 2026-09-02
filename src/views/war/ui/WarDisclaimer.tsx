import type { ReactNode } from "react";

/** 오해를 막기 위해 항상 노출하는 고정 문구. 접거나 숨기지 않는다. */
const DISCLAIMER_LINES = [
  "공개 시장 데이터의 시각화이며 거래 신호나 가격 예측이 아닙니다.",
  "애니메이션은 실제 개인이나 개별 주문을 나타내지 않습니다.",
  "거래소별 가격 통화가 달라 평균가는 원·달러 환율로 환산한 값이며, 거래대금은 합산하지 않습니다.",
] as const;

export function WarDisclaimer(): ReactNode {
  return (
    <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
      {DISCLAIMER_LINES.map((disclaimerLine) => (
        <span key={disclaimerLine} className="block">
          {disclaimerLine}
        </span>
      ))}
    </p>
  );
}
