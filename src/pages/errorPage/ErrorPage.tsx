import { KButton } from "kku-ui";
import { useCallback } from "react";
import { useRouteError } from "react-router-dom";
import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";

const ErrorPage = () => {

  // region [Hooks]

  const error = useRouteError();
  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  // region [Hooks]

  const onRouteBack = useCallback(() => {
    window.location.reload();
  }, []);

  // endregion

  return (
    <div className="error__page">
      <h2 className="error__page__title">예상치 못한 오류가 발생했습니다.</h2>
      <p>
        <i>{(error as Error)?.message || '알 수 없는 오류가 발생했습니다.'}</i>
      </p>
      <KButton onClick={onRouteBack}>새로고침</KButton>
    </div>
  );
};

export default ErrorPage;
