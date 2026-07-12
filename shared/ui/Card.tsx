"use client";

import {
  KCard,
  KCardContent,
  KCardDescription,
  KCardFooter,
  KCardHeader,
  type KCardProps,
  KCardTitle,
} from "kku-ui";

export type CardVariant = "glass" | "bare";

export interface CardProps extends KCardProps {
  variant?: CardVariant;
}

/**
 * KCard 기본 스타일(`border border-border bg-card shadow-sm`) 위에 얹는 프로젝트 공통 표현.
 * - glass: 배경을 글래스 서피스로 대체한 기본 카드
 * - bare: 테두리/배경/그림자를 걷어낸 투명 카드
 *
 * `shadow-none`만 `!` 접두사가 필요하다. Tailwind는 box-shadow 유틸을 정렬할 때
 * `none`을 `sm`보다 앞에 배치하므로, 스타일시트 순서와 무관하게 KCard의 `shadow-sm`이
 * 항상 뒤에 와서 이긴다. `border-0`/`bg-transparent`는 순서상 자연히 이기므로 불필요.
 */
const VARIANT_CLASS: Record<CardVariant, string> = {
  glass: "glass-surface",
  bare: "border-0 bg-transparent !shadow-none",
};

const Card = ({ variant = "glass", className, ...restProps }: CardProps) => (
  <KCard className={[VARIANT_CLASS[variant], className].filter(Boolean).join(" ")} {...restProps} />
);

export default Card;
export {
  KCardContent as CardContent,
  KCardDescription as CardDescription,
  KCardFooter as CardFooter,
  KCardHeader as CardHeader,
  KCardTitle as CardTitle,
};
