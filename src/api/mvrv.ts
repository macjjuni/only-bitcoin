import axios from "axios";
import { bearStore } from "@/store/store";
import { mvrvToast } from "@/utils/toast";

// mvrv 데이터 타입(이미지 제외)
export interface IMvrvValue {
  val: string;
  date: string;
}

// API로 조회한 객체 인터페이스(이미지 포함)
export interface IMvrv {
  src: string;
  mvrv: IMvrvValue;
}

const apuUrl = import.meta.env.VITE_MVRV_URL || "";
const mvrvStorageKey = "mvrv";

/**
 * @deprecated 서버 비용 문제로..
 */
export const getMVRVImage = async () => {
  try {
    const { data } = await axios.get<IMvrv>(`${apuUrl}/image/mvrv`);
    if (data.src === "error") throw Error("src is error string");
    window?.localStorage.setItem(mvrvStorageKey, `data:image/webp;base64, ${data.src}`); // 로걸 스토리지에 저장
    bearStore.setMvrv({
      value: data.mvrv.val,
      date: data.mvrv.date,
      timeStamp: new Date().getTime(), // 저장된 타임스탬프값 저장
    });
  } catch (err) {
    console.error(err);
    mvrvToast.error();
  }
};

export const getStorageMvrvImage = () => window?.localStorage.getItem(mvrvStorageKey) || "";
