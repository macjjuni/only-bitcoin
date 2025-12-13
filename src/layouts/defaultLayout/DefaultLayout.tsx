import { memo, ReactNode } from "react";
import "./DefaultLayout.scss";

const DefaultLayout = ({ children }: { children: ReactNode }) => {

  return (
    <div className="only-btc__layout">
      {children}
    </div>
  );
};

const MemoizedDefaultLayout = memo(DefaultLayout);
MemoizedDefaultLayout.displayName = 'DefaultLayout';
DefaultLayout.displayName = 'DefaultLayout';

export default MemoizedDefaultLayout;
