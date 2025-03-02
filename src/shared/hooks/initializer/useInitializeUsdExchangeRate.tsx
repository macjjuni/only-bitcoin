import { useEffect } from "react";
import useStore from "@/shared/stores/store";
import { isDev } from "@/shared/utils/common";


interface IExRateRes {
  date: string;
  usd: { krw: number };
}


const apiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json?ts=${Date.now()}`;

export default function useInitializeUsdExchangeRate() {

  // region [Hooks]

  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);
  const setExRate = useStore(state => state.setExRate);

  // endregion


  // region [Privates]

  async function getUsdExchangeRate() {

    try {

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data: IExRateRes = await response.json();

      const { date } = data;
      const usdToKrwExchangeRate = Math.floor(data?.usd?.krw) || 0;

      if (usdToKrwExchangeRate === 0) {
        throw new Error("USD 환율 데이터를 찾을 수 없습니다.");
      }

      setExRate({ value: usdToKrwExchangeRate, date });

      if (isDev) {
        console.log("✅ 환율 데이터 초기화");
      }
    } catch (e) {
      console.error(e);
      // toast.error("환율 데이터를 가져올 수 없어 한국 프리미엄 데이터를 표시할 수 없습니다.");
    }
  }

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    if (!isUsdtStandard) {
      getUsdExchangeRate().then();
    }
  }, [isUsdtStandard]);

  // endregion
}
