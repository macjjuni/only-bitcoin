import { memo } from "react";
import { KCard } from "kku-ui";
import { BitcoinIcon } from "@/shared/icon";
import "./BitcoinPriceCard.scss";

const sizes = { width: "260px", height: "161px" };


const BitcoinPriceCard = () => {

  return (
    <KCard className="dashboard__card__wrapper" {...sizes}>
      <div className="dashboard__card__wrapper__top__area">
        <BitcoinIcon size={48} color="#fff" />
        <div className="dashboard__card__wrapper__top__area__top__right">
          +10.4%
        </div>
      </div>
      <div className="dashboard__card__wrapper__bottom_area">
        <span className="dashboard__card__wrapper__bottom_area__price__text">$107,000</span>
        <span className="dashboard__card__wrapper__bottom_area__price__text">₩144,001,000</span>
      </div>
    </KCard>
  );
};

export default memo(BitcoinPriceCard);
