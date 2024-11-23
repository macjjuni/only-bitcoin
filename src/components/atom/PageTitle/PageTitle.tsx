import { memo, ReactNode } from "react";
import BtcIcon from "@/components/icon/BtcIcon";
import "./PageTitle.scss";

function PageTitle({ title }: { title: string | ReactNode }) {
  return (
    <h2 className="only-btc__page-title">
      <BtcIcon size={24} />
      {title}
    </h2>
  );
}

export default memo(PageTitle);
