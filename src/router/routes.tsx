import { TbSquareRoundedLetterK } from "react-icons/tb";
import { MdDashboard } from "react-icons/md";
import { Btc2KrwPage, HalvingPage, HomePage, PremiumPage } from "@/pages";

import TransIcon from "@/components/icon/TransIcon";
import HalfIcon from "@/components/icon/HalfIcon";
import { btcColor } from "@/data/btcInfo";

interface IRoute {
  id?: number;
  title: string;
  path: string;
  component: React.ReactNode;
  icon: React.ReactNode;
}

export const routesWithIcon: IRoute[] = [
  { id: 0, title: "Dashboard", path: "/", component: <HomePage />, icon: <MdDashboard fill={btcColor} size={28} /> },
  { id: 1, title: "BTC to KRW", path: "/btc2krw", component: <Btc2KrwPage />, icon: <TransIcon color="#eee" size={28} /> },
  { id: 2, title: "프리미엄", path: "/premium", component: <PremiumPage />, icon: <TbSquareRoundedLetterK size={28} /> },
  { id: 3, title: "반감기(Halving)", path: "/halving", component: <HalvingPage />, icon: <HalfIcon size={28} color="#39edd8" /> },
];

const routes = routesWithIcon.map((route) => {
  return { id: route.id, title: route.title, path: route.path, component: route.component };
});

export default routes;
