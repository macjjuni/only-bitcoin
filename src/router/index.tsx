import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import { TbSquareRoundedLetterK } from "react-icons/tb";

import Home from "@/pages/Home";
import PremiumPage from "@/pages/Premium";
import Halving from "@/pages/Halving";
import MvrvPage from "@/pages/Mvrv";
import Error from "@/pages/Error";
import App from "@/App";

import TransIcon from "@/components/icon/TransIcon";
import HalfIcon from "@/components/icon/HalfIcon";
import ChartIcon from "@/components/icon/ChartIcon";

interface IRoute {
  id?: number;
  title: string;
  path: string;
  component: React.ReactNode;
  icon: React.ReactNode;
}

export const routesWithIcon: IRoute[] = [
  { id: 0, title: "BTC2KRW", path: "/", component: <Home />, icon: <TransIcon size={28} /> },
  { id: 1, title: "프리미엄", path: "/premium", component: <PremiumPage />, icon: <TbSquareRoundedLetterK size={28} /> },
  { id: 2, title: "반감기(Halving)", path: "/halving", component: <Halving />, icon: <HalfIcon size={28} color="#39edd8" /> },
  { id: 3, title: "MVRV Z-Score", path: "/mvrv", component: <MvrvPage />, icon: <ChartIcon size={28} /> },
];

const routes = routesWithIcon.map((route) => {
  return { id: route.id, title: route.title, path: route.path, component: route.component };
});

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {routes.map((route) => (
        <Route key={route.id} path={route.path} element={route.component} />
      ))}
      <Route path="/*" element={<Error />} />
    </Route>
  )
);

export default router;
