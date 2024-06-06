import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import { ErrorPage } from "@/pages";
import routes from "@/router/routes";
import App from "@/App";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {routes.map((route) => (
        <Route key={route.id} path={route.path} element={route.component} />
      ))}
      <Route path="/*" element={<ErrorPage />} />
    </Route>
  )
);

export default router;
