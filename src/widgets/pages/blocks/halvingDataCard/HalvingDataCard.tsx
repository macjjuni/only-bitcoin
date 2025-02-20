import { memo } from "react";
import { KAccordion } from "kku-ui";
import { blockHalvingData } from "@/shared/constants/block";
import { comma } from "@/shared/utils/string";
import "./HalvingDataCard.scss";


const HalvingDataCard = () => {

  // region [Hooks]
  // endregion

  return (
    <KAccordion summary="반감기 데이터" className="halving-data-card__area">
      <ul className="halving-data-card__area__list">

        <li className="halving-data-card__area__list__item">
          <div className="halving-no">순서</div>
          {blockHalvingData.map(({ date }, idx) => (
            <div key={date} className="halving-no">{idx + 1}</div>
          ))}
        </li>
        <li className="halving-data-card__area__list__item">
          <div className="halving-date">날짜</div>
          {blockHalvingData.map(({ date }) => (
            <div key={date} className="halving-date">{date}</div>
          ))}
        </li>
        <li className="halving-data-card__area__list__item">
          <div className="halving-height">블록 높이</div>
          {blockHalvingData.map(({ blockHeight, date }) => (
            <div key={date} className="halving-date">{comma(blockHeight)}</div>
          ))}
        </li>
        <li className="halving-data-card__area__list__item">
          <div className="halving-reward">채굴 보상(단위: btc)</div>
          {blockHalvingData.map(({ blockReward, date }, idx) => (
            <div key={date} className="halving-date">{blockReward}</div>
          ))}
        </li>
      </ul>
    </KAccordion>
  );
};

export default memo(HalvingDataCard);
