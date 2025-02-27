import { memo } from "react";
import { Outlet } from "react-router";
import "./Content.scss";

const Content = () => {
  return (
    <main className="only-btc__layout__content">
      <Outlet />
    </main>
  );
};

export default memo(Content);
