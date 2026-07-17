import type { ReactNode } from "react";
import NotKeyNotYourBitcoin from "../NotKeyNotYourBitcoin";

interface PageLayoutProps {
  className?: string;
  children: ReactNode;
}

export default function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <section
      className={[
        // Safari 는 flex 스크롤 컨테이너의 padding-bottom 을 scrollHeight 에 포함 X.
        "relative w-full max-w-layout mx-auto flex flex-col flex-auto gap-2 p-2 pt-2.5",
        "pb-[calc(theme(height.bottom-nav)_+_theme(spacing.2))]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      <NotKeyNotYourBitcoin />
    </section>
  );
}
