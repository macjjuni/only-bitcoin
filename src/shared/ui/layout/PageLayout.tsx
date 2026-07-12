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
        // 하단 여백은 스크롤 컨테이너(main)가 아닌 이 아이템이 갖는다.
        // Safari 는 flex 스크롤 컨테이너의 padding-bottom 을 scrollHeight 에 포함하지 않는다.
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
