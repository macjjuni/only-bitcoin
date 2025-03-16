import React, { memo, ReactNode, useMemo } from "react";
import { NotKeyNotYourBitcoin } from "@/widgets";
import "./PageLayout.scss";


interface PageLayoutProps {
  className?: string;
  children: ReactNode;
}


const PageLayout = ({children, className}: PageLayoutProps) => {

  // region [Hooks]

  const rootClass = useMemo(() => {
    const clazz = ['page-layout'];

    if (className) {
      clazz.push(className);
    }

    return clazz.join(' ');
  }, [className]);

  // endregion


  return (
    <section className={rootClass}>
      {children}
      <NotKeyNotYourBitcoin />
    </section>
  );
};

export default memo(PageLayout);