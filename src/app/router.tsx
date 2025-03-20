import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Client from "@/app/Client";
import withSuspense from "@/widgets/hoc/withSuspence";
import ErrorPage from "@/pages/errorPage/ErrorPage";
import NotFoundPage from "@/pages/notFoundPage/NotFoundPage";

const OverviewPage = withSuspense(lazy(() => import("@/pages/overviewPage/OverviewPage")));
const BlocksPage = withSuspense(lazy(() => import("@/pages/blocksPage/BlocksPage")));
const Btc2FiatPage = withSuspense(lazy(() => import("@/pages/btc2fiatPage/Btc2FiatPage")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/premiumPage/PremiumPage")));
const SettingsPage = withSuspense(lazy(() => import("@/pages/settingsPage/SettingsPage")));
const MemePage = withSuspense(lazy(() => import("@/pages/memePage/MemePage")));

const clientRoutes = [
  { title: "Overview", path: "/", element: <OverviewPage />, isNav: false, isFavorite: false, icon: { name: 'dashboard', size: 30 }  },
  { title: "Overview", path: "/overview", element: <OverviewPage />, isNav: true, isFavorite: true, icon: { name: 'dashboard', size: 30 } },
  { title: "Blocks", path: "/blocks", element: <BlocksPage />, isNav: true, isFavorite: true, icon: { name: 'block', size: 32 }},
  { title: "BTC To Fiat", path: "/btc2fiat", element: <Btc2FiatPage />, isNav: true, isFavorite: true,icon: { name: 'exchange', size: 40 }, style: { padding: '3px' } },
  { title: "Premium", path: "/premium", element: <PremiumPage />, isNav: true, isFavorite: true,icon: { name: 'premium', size: 28 }},
  { title: "Settings", path: "/settings", element: <SettingsPage />, isNav: true, isFavorite: false ,icon: { name: 'setting', size: 30 } },
  { title: "Meme", path: "/meme", element: <MemePage />, isNav: false, isFavorite: false ,icon: { name: '', size: 30 } },
  { title: "404 - Not Found", path: "/*", element: <NotFoundPage />, isNav: false, isFavorite: false, icon: { name: '', size: 30 }, }
];


const browserRouter = createBrowserRouter([
  {
    path: "/",
    Component: Client,
    children: clientRoutes.map(({ title, isNav, icon, style, ...rest }) => ({
      ...rest, errorElement: <ErrorPage/>
    }))
  }
]);

const favoriteRouteList = clientRoutes.filter(({title, element, isFavorite, ...restProps}) => isFavorite && restProps);
const navigationRouteList = clientRoutes.filter(({title, element, isNav, ...restProps}) => isNav && restProps);

export default {clientRoutes, browserRouter, favoriteRouteList, navigationRouteList};
