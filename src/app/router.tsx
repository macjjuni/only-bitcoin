import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Client from "@/app/Client";
import withSuspense from "@/widgets/hoc/withSuspence";


const DashboardPage = withSuspense(lazy(() => import("@/pages/DashboardPage")));
const BlockStatusPage = withSuspense(lazy(() => import("@/pages/BlockStatusPage")));
const Btc2KrwPage = withSuspense(lazy(() => import("@/pages/Btc2krwPage")));
const PremiumPage = withSuspense(lazy(() => import("@/pages/PremiumPage")));


const router = createBrowserRouter([
  {
    path: "/",
    Component: Client,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/btc2krw", element: <Btc2KrwPage /> },
      { path: "/block-status", element: <BlockStatusPage /> },
      { path: "/premium", element: <PremiumPage /> },
      { path: "/*", element: <>error</> }
    ]
  }
]);

export default router;