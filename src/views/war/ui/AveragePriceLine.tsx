"use client";

import { type ReactNode, useMemo } from "react";
import { CountText } from "@/shared/ui";

interface AveragePriceLineProps {
  /** 화면에는 안 보이고 스크린 리더만 읽는 항목 이름. */
  label: string;
  currencySymbol: string;
  price: number;
  /** 압력 방향에 따라 바뀌는 글자 색 클래스. */
  colorClass: string;
  /** 숫자 오른쪽에 덧붙일 보조 표시. 김치 프리미엄 배지 같은 것. */
  suffixTemplate?: ReactNode;
}

/**
 * 평균가 한 줄.
 *
 * `dt`/`dd` 쌍이라 반드시 `dl` 바로 아래에 놓는다. 소수점은 버린다. 세 거래소 평균이라
 * 원 단위 아래는 의미가 없고, 굴러가는 숫자에 소수 자리가 붙으면 읽기만 어려워진다.
 */
export function AveragePriceLine({
  label,
  currencySymbol,
  price,
  colorClass,
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
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span className={`font-number text-xl font-bold ${colorClass}`}>{PriceValueTemplate}</span>
        {suffixTemplate}
      </dd>
    </>
  );
}
