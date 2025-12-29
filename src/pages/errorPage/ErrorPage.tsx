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
    <div className="flex flex-col justify-center items-center gap-3 h-full font-mono text-center p-6">
      <h2 className="text-md font-bold mb-2">알 수 없는 오류가 발생했습니다.</h2>

      <p className="text-sm w-full bg-[#1e1e1e] text-white p-3 rounded-md border border-[#30363d] max-w-md break-all leading-relaxed">
        <span className="text-[#7ee787] mr-2">$</span>
        {(error as Error)?.message || 'Unknown error occurred.'}
      </p>

      <KButton onClick={onRouteBack} className="mt-4">새로고침</KButton>
    </div>
  );
};

export default ErrorPage;
