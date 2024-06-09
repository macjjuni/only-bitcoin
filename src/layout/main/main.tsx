import { Outlet } from "react-router";
import "./main.scss";

const Main = () => {
  return (
    <main className="only-btc__main">
      <Outlet />
    </main>
  );
};

export default Main;
