import React, { memo } from "react";
import { KIcon } from "kku-ui";
import { ConnectionDot } from "@/components";
import SettingButton from "@/layouts/header/components/settingButton/SettingButton";
import "./Header.scss";

const Header = () => {

  return (
    <header className="header__area">
      <h2 className="header__area__text">
        <KIcon icon="bitcoin" size={40} color="currentColor" />
        ₿itcoin
      </h2>
      <div className="header__area__right">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
};

export default memo(Header);
