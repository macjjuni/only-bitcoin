import { memo, ReactNode } from "react";
import "./SmallCard.scss";

const Card = ({children}: {children: ReactNode}) => {

  return (
    <div className="small-card">
      {children}
    </div>
  );
};

export default memo(Card);