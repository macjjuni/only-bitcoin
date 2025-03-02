// import { toast } from "react-toastify";
// import { getCurrentDate } from "@/shared/utils/date";
import useStore from "@/shared/stores/store";

const fearGreedURI = "https://api.alternative.me/fng/";

interface FearGreedIndexResponseTypes {
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

export default async function initializeFearGreedIndex(): Promise<void> {

  const {setFearGreed} = useStore.getState();

  try {
    const response = await fetch(fearGreedURI);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data: FearGreedIndexResponseTypes = await response.json();

    setFearGreed({ value: Number(data.data[0].value), timestamp: Number(data.data[0].timestamp) });
  } catch (e) {
    console.error(e);
    // toast.error("Fear and Greed Index update Error!");
  }
};
