import { useCallback } from "react";
import { KButton } from "kku-ui";
import { useNavigate} from "react-router-dom";
import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";

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
    <div className="flex flex-col justify-center items-center gap-4 h-full">
      <h2 className="text-md font-bold layout-max:text-xl">404 - Error</h2>
      <h3 className="text-md layout-max:text-xl mb-4">페이지를 찾을 수 없습니다.</h3>
      <KButton variant="outline" onClick={onRouteBack}>뒤로가기</KButton>
    </div>
  );
};

export default NotFoundPage;
