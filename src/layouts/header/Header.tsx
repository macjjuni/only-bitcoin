import { memo } from "react";
import { Link } from "react-router";
import { KIcon } from "kku-ui";
import { ConnectionDot } from "@/components";
import SettingButton from "@/layouts/header/components/settingButton/SettingButton";
import useStore from "@/shared/stores/store";
import "./Header.scss";


const Header = () => {

  const initialPath = useStore(state => state.setting.initialPath);

  return (
    <header className="header__area">
      <h2 className="header__area__text">
        <Link to={initialPath} className="header__area__text__link">
          <KIcon icon="bitcoin" size={36} />
          ₿itcoin
        </Link>
      </h2>
      <div className="header__area__right">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
};


const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = "Header";
Header.displayName = "Header";

export default MemoizedHeader;
