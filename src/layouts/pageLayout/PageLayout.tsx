import React, { memo, ReactNode } from "react";
import { NotKeyNotYourBitcoin } from "../../components";
import "./PageLayout.scss";


interface PageLayoutProps {
  className?: string;
  children: ReactNode;
}


const PageLayout = ({ children, className }: PageLayoutProps) => {

  return (
    <section className={["page-layout", className].filter(Boolean).join(" ")}>
      {children}
      <NotKeyNotYourBitcoin />
    </section>
  );
};


const MemoizedPageLayout = memo(PageLayout);
MemoizedPageLayout.displayName = "PageLayout";
PageLayout.display = "PageLayout";

export default MemoizedPageLayout;