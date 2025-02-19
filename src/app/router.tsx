import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Client from "@/app/Client";
import withSuspense from "@/widgets/hoc/withSuspence";


const OverviewPage = withSuspense(lazy(() => import("@/pages/overviewPage/OverviewPage")));
const BlockPage = withSuspense(lazy(() => import("@/pages/blockPage/BlockPage")));
const Btc2KrwPage = withSuspense(lazy(() => import("@/pages/btc2krwPage/Btc2krwPage")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/premiumPage/PremiumPage")));
const SettingsPage = withSuspense(lazy(() => import("@/pages/settingsPage/SettingsPage")));


const clientRoutes = [
  { title: "Overview", path: "/", element: <OverviewPage />, isNav: false, isFavorite: false, icon: { name: 'dashboard', size: 30 } },
  { title: "Overview", path: "/overview", element: <OverviewPage />, isNav: true, isFavorite: true, icon: { name: 'dashboard', size: 30 } },
  { title: "Block", path: "/btc2krw", element: <BlockPage />, isNav: true, isFavorite: true,icon: { name: 'block', size: 32 }},
  { title: "BTC to KRW", path: "/block", element: <Btc2KrwPage />, isNav: true, isFavorite: true,icon: { name: 'exchange', size: 40 }, style: { padding: '3px' } },
  { title: "Premium", path: "/premium", element: <PremiumPage />, isNav: true, isFavorite: true,icon: { name: 'premium', size: 28 }},
  { title: "Settings", path: "/settings", element: <SettingsPage />, isNav: true, isFavorite: false ,icon: { name: 'setting', size: 30 } },
  { title: "404 - Not Found", path: "/*", element: <>error</>, isNav: false, isFavorite: false, icon: null, }
];


const browserRouter = createBrowserRouter([
  {
    path: "/",
    Component: Client,
    children: clientRoutes.map(({ title, isNav, icon, style, ...rest }) => rest)
  }
]);

const favoriteNavigationList = clientRoutes.filter(({title, element, isFavorite, ...restProps}) => isFavorite && restProps);

export default {clientRoutes, browserRouter, favoriteNavigationList};
