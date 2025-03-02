import React, { memo } from "react";
import { useTitle } from "@/shared/hooks";
import "./Header.scss";

const Header = () => {

  return (
    <h2 className="header__area">
      {useTitle().split(" ").map(text => (
        <span key={text} className="header__area__text">{text}</span>)
      )}
    </h2>
  );
};

export default memo(Header);
