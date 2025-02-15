import { lazy } from "react";

import { TbSquareRoundedLetterK } from "react-icons/tb";
import { AiOutlineBlock } from "react-icons/ai";
import { MdDashboard } from "react-icons/md";

import TransIcon from "@/components/icon/TransIcon";
import { btcColor } from "@/data/btcInfo";
import withSuspense from "@/components/hoc/withSuspense";

interface IRoute {
  id?: number;
  title: string;
  path: string;
  component: React.ReactNode;
  icon: React.ReactNode;
}

const Btc2KrwPage = withSuspense(lazy(() => import("@/pages/btc2krw/btc2krw")));
const HalvingPage = withSuspense(lazy(() => import("@/pages/blockStatus/blockStatus")));
const HomePage = withSuspense(lazy(() => import("@/pages/dashboard/dashboard")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/premium/premium")));

export const routesWithIcon: IRoute[] = [
  { id: 0, title: "대시보드", path: "/", component: <HomePage />, icon: <MdDashboard fill={btcColor} size={28} /> },
  { id: 1, title: "비트코인 계산기", path: "/btc2krw", component: <Btc2KrwPage />, icon: <TransIcon color="#eee" size={28} /> },
  { id: 2, title: "블록 현황", path: "/block-status", component: <HalvingPage />, icon: <AiOutlineBlock size={28} /> },
  { id: 3, title: "프리미엄", path: "/premium", component: <PremiumPage />, icon: <TbSquareRoundedLetterK size={28} /> },
];

const routes = routesWithIcon.map((route) => {
  return { id: route.id, title: route.title, path: route.path, component: route.component };
});

export default routes;
