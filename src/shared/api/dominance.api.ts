import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useEffect } from "react";
import fetcher from "@/shared/utils/fetcher";
import { floorToDecimal } from "@/shared/utils/number";
import { isDev } from "@/shared/utils/common";
import { ICurrency } from "@/shared/types/api/dominance";

const calculateBitcoinDominance = (list: ICurrency[]) => {

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


const BTC_DOMINANCE_API_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";

const fetchBitcoinDominance = async (): Promise<number | 'Error'> => {

  try {

    const data: ICurrency[] = await fetcher<ICurrency[]>(BTC_DOMINANCE_API_URL);

    if (isDev) { console.log("✅ 도미넌스 데이터 초기화!"); }
    return floorToDecimal(calculateBitcoinDominance(data), 2);

  } catch {
    return "Error";
  }
};


const useBitcoinDominanceQuery = () => {

  // region [Hooks]

  const { data: dominance, error, isSuccess, isError } = useQuery({
    queryKey: ["bitcoin-dominance"],
    queryFn: fetchBitcoinDominance,
    staleTime: 1000 * 60 * 10, // 10분 동안 데이터 유효
    refetchInterval: 1000 * 60 * 10, // 10분마다 갱신
    placeholderData: 0,
  });

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    if (isError && isDev) {
      toast.error("도미넌스 데이터 업데이트 에러!");
      console.log("❌ 도미넌스 데이터 업데이트 에러!", error);
    }
  }, [isError]);

  // endregion


  return { dominance, error, isError, isSuccess };
};

export default useBitcoinDominanceQuery;


