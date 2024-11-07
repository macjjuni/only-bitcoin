import axios from "axios";
import { toast } from "react-toastify";
import { getCurrentDate } from "@/utils/date";
import { FearGreedProps } from "@/store/store.interface";

const fearGreedURI = "https://api.alternative.me/fng/";

interface IResfearGreed {
  name: string;
  data: [
    {
      value: string;
      value_classification: string;
      timestamp: string;
      time_until_update: string;
    }
  ];
  metadata: {
    error: null | string;
  };
}

export const getFearGreed = async (): Promise<FearGreedProps> => {
  try {
    const { data } = await axios.get<IResfearGreed>(fearGreedURI);

    return {
      value: data.data[0].value,
      date: getCurrentDate(),
    };
  } catch (e) {
    console.error(e);
    toast.error("Fear and Greed Index update Error!");
    return {
      value: "error",
      date: "error",
    };
  }
};
