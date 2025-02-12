import { memo, ReactNode } from "react";
import "./DefaultLayout.scss";

const DefaultLayout = ({ children }: { children: ReactNode }) => {

  return (
    <div className="only-btc__layout">
      {children}
    </div>
  );
};

export default memo(DefaultLayout);
