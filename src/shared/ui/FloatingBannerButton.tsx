import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import TransitionLink from "./TransitionLink";

interface FloatingBannerButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}

export default function FloatingBannerButton({
  children,
  className,
  href,
  onClick,
  ...props
}: FloatingBannerButtonProps) {
  const commonClassName = [
    "flex items-center justify-center w-[52px] h-[52px] rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer tap-highlight-transparent",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleAnchorClick = onClick ? (e: MouseEvent<HTMLAnchorElement>) => onClick(e) : undefined;

  const handleButtonClick = onClick ? (e: MouseEvent<HTMLButtonElement>) => onClick(e) : undefined;

  if (href) {
    return (
      <TransitionLink href={href} className={commonClassName} onClick={handleAnchorClick}>
        {children}
      </TransitionLink>
    );
  }

  return (
    <button type="button" className={commonClassName} onClick={handleButtonClick} {...props}>
      {children}
    </button>
  );
}
