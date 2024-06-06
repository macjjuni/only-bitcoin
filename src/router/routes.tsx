import { TbSquareRoundedLetterK } from "react-icons/tb";
import { LiaHomeSolid } from "react-icons/lia";
import { HomePage, Btc2KrwPage, HalvingPage, MvrvPage, PremiumPage } from "@/pages";

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
  { id: 0, title: "Home", path: "/", component: <HomePage />, icon: <LiaHomeSolid size={28} /> },
  { id: 1, title: "BTC2KRW", path: "/btc2krw", component: <Btc2KrwPage />, icon: <TransIcon size={28} /> },
  { id: 2, title: "프리미엄", path: "/premium", component: <PremiumPage />, icon: <TbSquareRoundedLetterK size={28} /> },
  { id: 3, title: "반감기(Halving)", path: "/halving", component: <HalvingPage />, icon: <HalfIcon size={28} color="#39edd8" /> },
  { id: 4, title: "MVRV Z-Score", path: "/mvrv", component: <MvrvPage />, icon: <ChartIcon size={28} /> },
];

const routes = routesWithIcon.map((route) => {
  return { id: route.id, title: route.title, path: route.path, component: route.component };
});

export default routes;
