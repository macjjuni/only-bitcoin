import { memo, useCallback } from "react";
import { KIcon } from "kku-ui";
import { Link, useLocation, useNavigate } from "react-router";
import { SettingIcon } from "@/components/ui/icon";


const SettingButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const onRouteBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // 뒤로가기 버튼 스타일
  if (location.pathname === '/settings') {
    return (
      <KIcon
        icon="arrow_left"
        className="p-0.5 cursor-pointer tap-highlight-transparent"
        size={34}
        onClick={onRouteBack}
      />
    );
  }

  // 설정 버튼 스타일
  return (
    <Link to="/settings" className="inline-flex justify-center items-center p-0.5 m-0 !no-underline tap-highlight-transparent">
      <SettingIcon size={30} className="text-gray-400" />
    </Link>
  );
};


const MemoizedSettingButton = memo(SettingButton)

MemoizedSettingButton.displayName = "SettingButton";
SettingButton.displayName = "SettingButton";

export default MemoizedSettingButton;