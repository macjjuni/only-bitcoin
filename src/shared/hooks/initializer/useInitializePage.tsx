import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useStore from "@/shared/stores/store";


export default function useInitializePage() {

  // region [Hooks]

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const initialPath = useStore(state => state.setting.initialPath);

  // endregion


  // region [Privates]

  const initializePage = useCallback(() => {
    if (pathname === "/") {
      navigate(initialPath, { replace: true });
    }
  }, []);

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    initializePage();
  }, []);

  // endregion
}