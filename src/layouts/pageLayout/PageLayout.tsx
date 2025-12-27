import React, { memo, ReactNode, useMemo } from "react";
import { NotKeyNotYourBitcoin } from "@/components";


interface PageLayoutProps {
  className?: string;
  children: ReactNode;
}


const PageLayout = ({ children, className }: PageLayoutProps) => {

  const combinedClassName = useMemo(() => (
    ["relative w-full max-w-layout mx-auto flex flex-col flex-auto gap-2", className].filter(Boolean).join(" ")
  ), [className]);

  return (
    <section className={combinedClassName}>
      {children}
      <NotKeyNotYourBitcoin />
    </section>
  );
};


const MemoizedPageLayout = memo(PageLayout);
MemoizedPageLayout.displayName = "PageLayout";
PageLayout.display = "PageLayout";

export default MemoizedPageLayout;