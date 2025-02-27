import { memo, ReactNode } from "react";
import { KCard } from "kku-ui";
import "./SquareCard.scss";

const sizes = { width: "260px", height: "161px"};


const SquareCard = ({children}: {children: ReactNode}) => {

  return (
    <KCard className="dashboard__card__wrapper" {...sizes}>
      {children}
    </KCard>
  );
};

export default memo(SquareCard);
