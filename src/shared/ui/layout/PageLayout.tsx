import type { ReactNode } from "react";
import NotKeyNotYourBitcoin from "../NotKeyNotYourBitcoin";

interface PageLayoutProps {
  className?: string;
  /**
   * 하단 네비게이션 자리만큼 여백을 둘지 여부.
   * `route.tsx` 에서 `hideBottomNav` 를 켠 경로는 false 로 넘겨야 빈 여백이 남지 않는다.
   */
  hasBottomNav?: boolean;
  children: ReactNode;
}

export default function PageLayout({ children, className, hasBottomNav = true }: PageLayoutProps) {
  return (
    <section
      className={[
        // Safari 는 flex 스크롤 컨테이너의 padding-bottom 을 scrollHeight 에 포함 X.
        "relative w-full max-w-layout mx-auto flex flex-col flex-auto gap-2 p-2 pt-2.5",
        hasBottomNav ? "pb-[calc(theme(height.bottom-nav)_+_theme(spacing.2))]" : null,
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
