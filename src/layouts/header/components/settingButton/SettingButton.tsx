import { memo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Undo2Icon } from "lucide-react";
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
      <Undo2Icon size={32} className="text-current cursor-pointer" onClick={onRouteBack} />
    );
  }

  // 설정 버튼 스타일
  return (
    <Link to="/settings" className="inline-flex justify-center items-center">
      <SettingIcon size={32} className="text-gray-400" />
    </Link>
  );
};


const MemoizedSettingButton = memo(SettingButton)

MemoizedSettingButton.displayName = "SettingButton";
SettingButton.displayName = "SettingButton";

export default MemoizedSettingButton;