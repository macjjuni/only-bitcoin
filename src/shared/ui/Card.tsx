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

export type CardProps = KCardProps;

const Card = ({ className, ...restProps }: CardProps) => (
  <KCard
    className={[
      "glass-surface",
      "border-[0.75px] border-neutral-300 dark:!border-neutral-600",
      className,
    ]
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
