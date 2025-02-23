import React, { memo, useMemo } from "react";
import { CountText, Lottie } from "@/widgets";
import useStore from "@/shared/stores/store";
import { calcPremiumPercent } from "@/shared/utils/common";
import { formatDate } from "@/shared/lib/date";
import premiumData from "@/shared/assets/lottie/premium.json";
import "./PremiumPannel.scss";


const PremiumPannel = () => {

  // region [Hooks]

  const { krw, usd } = useStore(state => state.bitcoinPrice);
  const { value: usdExRate, date } = useStore(state => state.exRate);

  // endregion


  // region [Templates]

  const PremiumDataList = useMemo(() => [
    { title: "국내 시세", krw, usd: krw / usdExRate },
    { title: "해외 시세", krw: usd * usdExRate, usd }
  ], [krw, usd, usdExRate]);

  const PremiumLottie = useMemo(() => (
    <Lottie animationData={premiumData} width="54px" height="54px"
            style={{ marginLeft: "-8px" }}/>
  ), []);

  // endregion


  return (
    <div className="premium-pannel">

      <div className="premium-pannel__title">
        {PremiumLottie}
        <div className="premium-pannel__title__area">
          <CountText value={calcPremiumPercent(krw, usd, usdExRate)} decimals={2}
                     className="premium-pannel__text" />
          <span className="unit">%</span>
        </div>
      </div>

      <div className="premium-pannel__content">
        {
          PremiumDataList.map(item => (
            <div key={item.title} className="premium-pannel__content__item">
              <div className="premium-pannel__content__item__title">{item.title}</div>
              <div className="premium-pannel__content__item__content">
                <div className="premium-pannel__content__item__content__item">
                  <CountText className="price__text" value={item.krw} />
                  <span className="unit__text">KRW</span>
                </div>
                <div className="premium-pannel__content__item__content__item">
                  <CountText className="price__text" value={item.usd} />
                  <span className="unit__text">USD</span>
                </div>
              </div>
            </div>
          ))
        }

        <div className="premium-pannel__content__item">
          <div className="premium-pannel__content__item__title">환율(USD/KRW)</div>
          <div className="premium-pannel__content__item__content">
            <div className="premium-pannel__content__item__content__item">
              <div className="premium-pannel__content__item__content__item--left">
                <span className="price__text">1</span>
                <span className="unit__text">USD</span>
                <span className="slash__text">/</span>
                <CountText className="price__text" value={usdExRate} />
                <span className="unit__text">KRW</span>
              </div>
              <div className="premium-pannel__content__item__content__item--right">
                <span className="date__text">({formatDate(date, "YYYY.MM.DD")})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default memo(PremiumPannel);