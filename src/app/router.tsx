import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import Client from "@/app/Client";
import withSuspense from "@/components/hoc/withSuspense";
import ErrorPage from "@/pages/errorPage/ErrorPage";
import NotFoundPage from "@/pages/notFoundPage/NotFoundPage";
import { DashboardIcon, BlockIcon, ExchangeIcon, PremiumIcon, PillIcon } from "@/components/icon";

const OverviewPage = withSuspense(lazy(() => import("@/pages/overviewPage/OverviewPage")));
const BlocksPage = withSuspense(lazy(() => import("@/pages/blocksPage/BlocksPage")));
const Btc2FiatPage = withSuspense(lazy(() => import("@/pages/btc2fiatPage/Btc2FiatPage")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/premiumPage/PremiumPage")));
const OrangePillPage = withSuspense(lazy(() => import("@/pages/orangePillPage/OrangePillPage")));
const SettingsPage = withSuspense(lazy(() => import("@/pages/settingsPage/SettingsPage")));
const MemePage = withSuspense(lazy(() => import("@/pages/memePage/MemePage")));
const BIP39Page = withSuspense(lazy(() => import("@/pages/bip39/BIP39Page")));

const clientRoutes = [
  { title: "Overview", path: "/", element: <OverviewPage />, isNav: false, isFavorite: false, icon: <DashboardIcon size={32} />  },
  { title: "Overview", path: "/overview", element: <OverviewPage />, isNav: true, isFavorite: true, icon: <DashboardIcon size={32} /> },
  { title: "Blocks", path: "/blocks", element: <BlocksPage />, isNav: true, isFavorite: true, icon: <BlockIcon size={32} /> },
  { title: "BTC To Fiat", path: "/btc2fiat", element: <Btc2FiatPage />, isNav: true, isFavorite: true,icon: <ExchangeIcon size={34} /> },
  { title: "Premium", path: "/premium", element: <PremiumPage />, isNav: true, isFavorite: true,icon: <PremiumIcon size={30} /> },
  { title: "Orange Pill", path: "/orange-pill", element: <OrangePillPage />, isNav: true, isFavorite: true,icon: <PillIcon size={30} /> },
  { title: "BIP39", path: "/orange-pill/bip39", element: <BIP39Page />, isNav: false, isFavorite: false, icon: null },
  { title: "Settings", path: "/settings", element: <SettingsPage />, isNav: false, isFavorite: false ,icon: null },
  { title: "Meme", path: "/orange-pill/meme", element: <MemePage />, isNav: false, isFavorite: false ,icon: null },
  { title: "Meme_temp", path: "/meme", element: <Navigate to="/orange-pill/meme" replace />, isNav: false, isFavorite: false ,icon: null },
  { title: "404 - Not Found", path: "/*", element: <NotFoundPage />, isNav: false, isFavorite: false, icon: null }
];

const browserRouter = createBrowserRouter([
  {
    path: "/",
    Component: Client,
    children: clientRoutes.map(({ title, isNav, icon, ...rest }) => ({
      ...rest, errorElement: <ErrorPage/>
    }))
  }
]);

const favoriteRouteList = clientRoutes.filter(({title, element, isFavorite, ...restProps}) => isFavorite && restProps);
const navigationRouteList = clientRoutes.filter(({title, element, isNav, ...restProps}) => isNav && restProps);

export default {clientRoutes, browserRouter, favoriteRouteList, navigationRouteList};
