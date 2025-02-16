import React, { memo } from "react";
import { useTitle } from "@/shared/hooks";
import "./PageTitle.scss";

const PageTitle = () => {

  return (
    <h2 className="page-title">
      <span className="page-title__text">{useTitle()}</span>
  </h2>);
};

export default memo(PageTitle);
