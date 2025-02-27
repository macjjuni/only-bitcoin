// import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import { isDev } from "@/shared/utils/common";

const apiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json?ts=${Date.now()}`;

interface IExRateRes {
  date: string;
  usd: { krw: number };
}

export default async function initializeUsdExchangeRate(): Promise<void> {

  const { setExRate, setting } = useStore.getState();

  if (setting.isUsdtStandard) {
    return;
  }

  if (isDev) {
    console.log("✅ 환율 데이터 초기화");
  }

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
  } catch (e) {
    console.error(e);
    // toast.error("환율 데이터를 가져올 수 없어 한국 프리미엄 데이터를 표시할 수 없습니다.");
  }
}
