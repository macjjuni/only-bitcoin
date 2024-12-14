import axios from "axios";
import { toast } from "react-toastify";
import { type ExRateProps } from "@/store/store.interface";

const apiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json?ts=${Date.now()}`;

interface IExRateRes {
  date: string;
  usd: { krw: number };
}

export default async function getUsdExchangeRate(): Promise<ExRateProps> {
  try {
    const res = await axios.get<IExRateRes>(apiUrl);

    const { date } = res.data;
    const usdToKrwExchangeRate = Math.floor(res.data?.usd?.krw) || null;

    if (!usdToKrwExchangeRate) {
      throw new Error("USD 환율 데이터를 찾을 수 없습니다.");
    }

    return { basePrice: usdToKrwExchangeRate, date, provider: "Free Currency Exchange Rates" };
  } catch (e) {
    console.error(e);
    toast.error("환율 데이터를 가져올 수 없어 김치 프리미엄 데이터를 표시할 수 없습니다.");
    return { basePrice: 0, date: "error", provider: "error" };
  }
}
