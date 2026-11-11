import type { BIP39Item } from "../model/types";

const BIP39_URL =
  "https://raw.githubusercontent.com/bitcoin/bips/refs/heads/master/bip-0039/english.txt" as const;

/** 훅이 아니라 서버 컴포넌트에서 부르는 조회 함수임. */
const getBip39Data = async (): Promise<BIP39Item[]> => {
  try {
    const res = await fetch(BIP39_URL, { method: "GET", headers: { Accept: "text/plain" } });
    const text = await res.text();
    return text
      .trim()
      .split("\n")
      .map((word, index) => ({ index: index + 1, word }));
  } catch (err) {
    console.error(err);
    throw new Error("BIP39 불러오기 실패");
  }
};

export default getBip39Data;
