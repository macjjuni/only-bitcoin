import axios from "axios";
import { toast } from "react-toastify";
import moment from "moment";
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

    const ResponseData = {
      value: data.data[0].value,
      date: moment().format("yyyy.MM.DD HH:mm:ss"),
    };
    return ResponseData;
  } catch (e) {
    console.error(e);
    toast.error("Fear and Greed Index update Error!");
    return {
      value: "error",
      date: "error",
    };
  }
};
