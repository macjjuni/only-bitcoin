import React, { memo } from "react";
import { useTitle } from "@/shared/hooks";
import { NetworkSwitch } from "@/widgets";
import "./Header.scss";

const Header = () => {

  return (
    <h2 className="header__area">
      <div className="header__area__text">
        {useTitle().split(" ").map(text => (
          <span key={text} className="header__area__text">{text}</span>)
        )}
      </div>

      <NetworkSwitch />
    </h2>
  );
};

export default memo(Header);
