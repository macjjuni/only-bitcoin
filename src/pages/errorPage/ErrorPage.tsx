import { KButton } from "kku-ui";
import "./ErrorPage.scss";
import { useNavigate, useRouteError } from "react-router-dom";
import { useCallback } from "react";

const ErrorPage = () => {

  // region [Hooks]

  const error = useRouteError();
  const navigate = useNavigate();

  // endregion


  // region [Hooks]

  const onRouteBack = useCallback(() => {
    navigate('/', { replace: true});
  }, []);

  // endregion

  return (
    <div className="error-page">
      <h2 className="error-page__title">예상치 못한 오류가 발생했습니다.</h2>
      <p>
        <i>{(error as Error)?.message || '알 수 없는 오류가 발생했습니다.'}</i>
      </p>
      <KButton label="돌아가기" onClick={onRouteBack} />
    </div>
  );
};

export default ErrorPage;