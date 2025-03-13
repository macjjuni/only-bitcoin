import React, { memo } from "react";
import { useTitle } from "@/shared/hooks";
import { NetworkSwitch } from "@/widgets";
import "./Header.scss";

const Header = () => {

  return (
    <header className="header__area">
      <h2 className="header__area__text">
        {useTitle().split(" ").map(text => (
          <span key={text} className="header__area__text">{text}</span>)
        )}
      </h2>
      <NetworkSwitch />
    </header>
  );
};

export default memo(Header);
