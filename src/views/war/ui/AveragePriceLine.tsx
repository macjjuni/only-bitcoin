"use client";

import { type ReactNode, useMemo } from "react";
import { CountText } from "@/shared/ui";

/** 값 크기. 원화를 주 값으로 세우고 달러는 보조로 낮춘다. */
type AveragePriceEmphasis = "primary" | "secondary";

const VALUE_CLASSES: Record<AveragePriceEmphasis, string> = {
  primary: "text-2xl",
  secondary: "text-base",
};

interface AveragePriceLineProps {
  /** 항목 이름. 화면에도 보이고 스크린 리더도 그대로 읽는다. */
  label: string;
  currencySymbol: string;
  price: number;
  /** 압력 방향에 따라 바뀌는 글자 색 클래스. */
  colorClass: string;
  emphasis?: AveragePriceEmphasis;
  /** 숫자 오른쪽에 덧붙일 보조 표시. 김치 프리미엄 배지 같은 것. */
  suffixTemplate?: ReactNode;
}

/**
 * 평균가 한 줄.
 *
 * `dt`/`dd` 쌍이라 반드시 `dl` 바로 아래에 놓는다. 두 요소가 격자 칸을 하나씩 차지해
 * 이름 열과 값 열이 줄마다 맞아떨어진다. 소수점은 버린다. 세 거래소 평균이라 원 단위
 * 아래는 의미가 없고, 굴러가는 숫자에 소수 자리가 붙으면 읽기만 어려워진다.
 */
export function AveragePriceLine({
  label,
  currencySymbol,
  price,
  colorClass,
  emphasis = "primary",
  suffixTemplate = null,
}: AveragePriceLineProps): ReactNode {
  //#region [Templates]
  const PriceValueTemplate = useMemo((): ReactNode => {
    if (price <= 0) {
      return "-";
    }

    return (
      <>
        {currencySymbol}
        <CountText value={price} decimals={0} />
      </>
    );
  }, [price, currencySymbol]);
  //#endregion

  return (
    <>
      <dt className="text-[11px] font-bold text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-2">
        <span className={`font-number font-bold ${VALUE_CLASSES[emphasis]} ${colorClass}`}>
          {PriceValueTemplate}
        </span>
        {suffixTemplate}
      </dd>
    </>
  );
}
