import { memo, useMemo } from "react";
import { KAccordion } from "kku-ui";
import { blockHalvingData } from "@/shared/constants/block";
import useStore from "@/shared/stores/store";
import "./HalvingDataCard.scss";


const HalvingDataCard = () => {

  // region [Templates]

  const currentBlockHeight = useStore(state=> state.blockData[0].height || 0);

  const nextHalvingIndex = useMemo(() => (
    blockHalvingData.findIndex(({ blockHeight }) => blockHeight > currentBlockHeight)
  ), [currentBlockHeight]);

  const HalvingDataList = useMemo(()=> [
    {label: '순서', items: blockHalvingData.map(({ date }, idx) => ({value: idx+1, key: date}))},
    {label: '날짜', items: blockHalvingData.map(({ date }) => ({value: date, key: date}))},
    {label: '블록 높이', items: blockHalvingData.map(({ date, blockHeight }) => ({value: blockHeight, key: date}))},
    {label: '채굴 보상(단위: btc)', items: blockHalvingData.map(({ blockReward, date }) => ({value: blockReward, key: date}))},
  ], [])

  // endregion


  return (
    <KAccordion summary="반감기 정보" className="halving-data-card__area">
      <ul className="halving-data-card__area__list">
        {
          HalvingDataList.map(({label, items}) => (

            <div key={label} className="halving-data-card__area__list__item">
              <div className="halving__label">{label}</div>
              {items.map(({value, key}, idx)=> (
                <div key={key} className={`halving__text ${nextHalvingIndex === idx ? 'active' : ''}`}>
                  {value}
                </div>
              ))}
            </div>
          ))
        }
      </ul>
    </KAccordion>
  );
};

export default memo(HalvingDataCard);
