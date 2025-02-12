import { memo, ReactNode } from "react";
import { KCard } from "kku-ui";
import "./Card.scss";

const sizes = { width: "260px", height: "161px"};


const Card = ({children}: {children: ReactNode}) => {

  return (
    <KCard className="dashboard__card__wrapper" variant="contained" {...sizes}>
      {children}
    </KCard>
  );
};

export default memo(Card);