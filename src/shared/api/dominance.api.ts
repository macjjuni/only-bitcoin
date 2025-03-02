import { toast } from "react-toastify";
import { isDev } from "@/shared/utils/common";
import { valueCheck } from "@/shared/utils/string";
import { calcCurrentDateDifference } from "@/shared/lib/date";
import useStore from "@/shared/stores/store";
import interval from "@/shared/utils/interval";
import { floorToDecimal } from "@/shared/utils/number";


const btcDUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";

export interface ICurrency {
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_change_percentage: number | null;
  atl_date: string | null;
  circulating_supply: number | null;
  current_price: number | null;
  fully_diluted_valuation: number | null;
  high_24h: number | null;
  id: string | null;
  image: string | null;
  last_updated: string | null;
  low_24h: number | null;
  market_cap: number;
  market_cap_change_24h: number | null;
  market_cap_change_percentage_24h: number | null;
  market_cap_rank: 1;
  max_supply: number | null;
  name: string | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  roi: null;
  symbol: string | null;
  total_supply: number | null;
  total_volume: number | null;
}

const limitMins = 10; // 10분
const intervalTime = 5 * 60000; // 5분(ms)


const getDominance = (list: ICurrency[]) => {
  // Initializes variables
  let BTCCap = 0;
  let altCap = 0;

  list.forEach((x) => {
    if (x.id === "bitcoin") {
      BTCCap = x.market_cap;
      altCap += x.market_cap;
    } else {
      altCap += x.market_cap;
    }
  });
  return ((BTCCap / altCap) * 100);
};


export default async function initializeBitcoinDominance(): Promise<void> {

  if (isDev) {
    console.log("✅ BTC 도미넌스 초기화");
  }

  const { dominance, setDominance } = useStore.getState();


  const updateDominance = async () => {

    try {
      const response = await fetch(btcDUrl);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data: ICurrency[] = await response.json();
      const dominancePercent = getDominance(data);

      setDominance({ value: floorToDecimal(dominancePercent, 2), timestamp: Date.now() });
    } catch (e) {
      console.error(e);
      toast.error("비트코인 도미넌스 업데이트 실패️");
    }
  };

  const updateCheck = () => {

    const valCheck = valueCheck(dominance.timestamp);

    if (!valCheck) {
      updateDominance();
    } else {
      const minDiff = calcCurrentDateDifference(dominance.timestamp, "minute");

      if (minDiff > limitMins) {
        updateDominance();
      }
    }
  };

  updateCheck(); // 최초 실행
  const blockInterval = interval(updateDominance, intervalTime);
  blockInterval.start();
}
