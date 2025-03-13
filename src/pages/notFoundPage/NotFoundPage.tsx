import { useCallback } from "react";
import { KButton } from "kku-ui";
import { useNavigate} from "react-router-dom";
import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import "./NotFoundPage.scss";

const NotFoundPage = () => {

  // region [Hooks]

  const navigation = useNavigate();
  usePageAnimation(useOutletContext<UsePageAnimation>());

  // endregion


  // region [Hooks]

  const onRouteBack = useCallback(() => {
    navigation(-1, );
  }, []);

  // endregion

  return (
    <div className="not-found__page">
      <h2 className="not-found__page__title">페이지를 찾을 수 없습니다.</h2>
      <KButton label="뒤로가기" onClick={onRouteBack} />
    </div>
  );
};

export default NotFoundPage;
