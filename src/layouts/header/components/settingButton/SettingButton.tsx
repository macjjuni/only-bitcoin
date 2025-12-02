import { memo, useCallback } from "react";
import { KIcon } from "kku-ui";
import { Link, useLocation, useNavigate } from "react-router";
import { SettingIcon } from "@/components/ui/icon";
import "./SettingButton.scss";

const SettingButton = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const onRouteBack = useCallback(() => {
    navigate(-1);
  }, [])

  if (location.pathname === '/settings') {
    return (
      <KIcon icon="arrow_left" className="back-button" size={34} onClick={onRouteBack} />
    )
  }

  return (
    <Link to="/settings" className="setting-button">
      <SettingIcon size={30} color="currentColor" />
    </Link>
  );
};

export default memo(SettingButton);