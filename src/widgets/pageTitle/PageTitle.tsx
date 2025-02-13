import React, { memo } from "react";
import { useTitle } from "@/shared/hooks";
import "./PageTitle.scss";

const PageTitle = () => {


  return (
    <h2 className="page-title">{useTitle()}</h2>
  );
};

export default memo(PageTitle);
