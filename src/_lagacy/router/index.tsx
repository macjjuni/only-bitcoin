import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import ErrorPage from "@/pages/error/error";
import routes from "@/router/routes";
import Client from "@/app/Client";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Client />}>
      {routes.map((route) => (
        <Route key={route.id} path={route.path} element={route.component} />
      ))}
      <Route path="/*" element={<ErrorPage />} />
    </Route>
  )
);

export default router;
