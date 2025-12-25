import { memo, ReactNode } from "react";


const DefaultLayout = ({ children }: { children: ReactNode }) => (
    <div className="relative flex flex-col w-full max-w-layout h-[100dvh] m-0 mx-auto overflow-x-hidden layout-max:border-x border-border">
      {children}
    </div>
);

const MemoizedDefaultLayout = memo(DefaultLayout);
MemoizedDefaultLayout.displayName = 'DefaultLayout';
DefaultLayout.displayName = 'DefaultLayout';

export default MemoizedDefaultLayout;
