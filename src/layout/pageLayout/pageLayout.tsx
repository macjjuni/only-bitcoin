import { memo, ReactNode, useMemo } from "react";
import "./pageLayout.scss";

function PageLayout({ children, className }: { children: ReactNode; className?: string }) {
  const rootClass = useMemo(() => {
    if (className) {
      return className;
    }
    return "";
  }, []);
  return <div className={`only-btc__page-layout ${rootClass}`}>{children}</div>;
}

export default memo(PageLayout);
