
type BIP39Response = { index: number, word: string };

const BIP39_URL = "https://raw.githubusercontent.com/bitcoin/bips/refs/heads/master/bip-0039/english.txt" as const;

const fetchBIP39 = async (): Promise<BIP39Response[]> => {
  try {
    const res = await fetch(BIP39_URL, { method: "GET", headers: { "Accept": "text/plain" } });
    const text = await res.text();
    return text.trim().split("\n").map((word, index) => ({ index: index + 1, word }));
  } catch (err) {
    console.error(err);
    throw new Error("BIP39 불러오기 실패");
  }
};

export default fetchBIP39;