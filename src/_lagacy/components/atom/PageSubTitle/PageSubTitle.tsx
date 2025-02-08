import { ReactNode, memo } from "react";
import "./PageSubTitle.scss";

interface PageSubTitleProps {
  subTitle: string | ReactNode;
}

function PageSubTitle({ subTitle }: PageSubTitleProps) {
  return <h3 className="only-btc__page-sub-title">📌 {subTitle}</h3>;
}

export default memo(PageSubTitle);
