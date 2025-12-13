import React, { memo, useMemo } from "react";
import { CountText, Lottie } from "../../../../components";
import useStore from "@/shared/stores/store";
import { calcPremiumPercent } from "@/shared/utils/calculate";
import { formatDate } from "@/shared/lib/date";
import premiumData from "@/shared/assets/lottie/premium.json";
import "./PremiumPannel.scss";


const PremiumPannel = () => {

  // region [Hooks]

  const currency = useStore(state => state.setting.currency);
  const { krw, usd } = useStore(state => state.bitcoinPrice);
  const { value: usdExRate, date } = useStore(state => state.exRate);
  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);

  // endregion


  // region [Templates]

  const PremiumDataList = useMemo(() => {

    const usdKoreaPrice = krw / usdExRate;
    const krwGlobalPrice = usd * usdExRate;

    return [
      { title: "프리미엄", krw: krw - krwGlobalPrice, usd: usdKoreaPrice - usd },
      { title: "국내 시세", krw, usd: usdKoreaPrice },
      { title: "해외 시세", krw: krwGlobalPrice, usd }
    ];
  }, [krw, usd, usdExRate]);


  const PremiumLottie = useMemo(() => (
    <Lottie animationData={premiumData} width="54px" height="54px" style={{ marginLeft: "-8px" }} />
  ), []);

  // endregion

  return (
    <div className="premium-pannel">

      <div className="premium-pannel__title">
        {PremiumLottie}
        <div className="premium-pannel__title__area">
          {
            usdExRate !== 0 ? (
                <>
                  <CountText value={calcPremiumPercent(krw, usd, usdExRate)} decimals={2}
                             className="premium-pannel__text" />
                  <span className="unit">%</span>
                </>
              ) :
              <span className="premium-pannel__text">Error</span>
          }
        </div>
      </div>

      <div className="premium-pannel__content">
        {
          PremiumDataList.map(item => (
            <div key={item.title} className="premium-pannel__content__item">
              <div className="premium-pannel__content__item__title">{item.title}</div>
              <div className="premium-pannel__content__item__content">
                {
                  currency.includes("KRW") && (
                    <div className="premium-pannel__content__item__content__item">
                      <CountText className="price__text" value={item.krw} />
                      <span className="unit__text">KRW</span>
                    </div>)
                }
                {
                  currency.includes("USD") && (
                    <div className="premium-pannel__content__item__content__item">
                      <CountText className="price__text" value={item.usd} />
                      <span className="unit__text">USD</span>
                    </div>
                  )
                }
              </div>
            </div>
          ))
        }

        <div className="premium-pannel__content__item">
          <div className="premium-pannel__content__item__title">
            {!isUsdtStandard ? "실시간 환율(USD/KRW)" : "USDT/KRW"}
          </div>
          <div className="premium-pannel__content__item__content">
            <div className="premium-pannel__content__item__content__item">
              <div className="premium-pannel__content__item__content__item--left">
                <span className="price__text">1</span>
                <span className="unit__text">{!isUsdtStandard ? "USD" : "USDT"}</span>
                <span className="slash__text">/</span>
                <CountText className="price__text" value={usdExRate} decimals={1} />
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
