import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import router from "@/app/router";

export default function useTitle() {

  // region [Hooks]

  const {clientRoutes} = router;
  const location = useLocation();

  // endregion


  return useMemo(() => {

    const currentRoute = clientRoutes.find(route => route.path === location.pathname);
    return currentRoute ? currentRoute.title : '404 - Not Found';
  }, [location]);
}
