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

export interface CardProps extends KCardProps {
  /**
   * 카드 표면 종류.
   * - `default`: 일반 섹션.
   * - `accent`: 화면당 하나, 핵심 수치를 담는 강조 카드. 테두리만 주황.
   */
  variant?: "default" | "accent";
}

/**
 * 화면의 모든 카드가 쓰는 표면. 모양은 `globals.css` 의 `.card-surface` 한 곳에서 정함.
 * 화면에서 테두리 · 배경을 따로 조합하지 않는다. 그러면 화면마다 카드가 달라짐.
 */
const Card = ({ className, variant = "default", ...restProps }: CardProps) => (
  <KCard
    className={["card-surface", variant === "accent" && "card-surface-accent", className]
      .filter(Boolean)
      .join(" ")}
    {...restProps}
  />
);

export default Card;
export {
  KCardContent as CardContent,
  KCardDescription as CardDescription,
  KCardFooter as CardFooter,
  KCardHeader as CardHeader,
  KCardTitle as CardTitle,
};
