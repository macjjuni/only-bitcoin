import { useMemo } from "react";
import { useOutletContext } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import "./BIP39Page.scss";

type BIP39Response = { index: number, word: string };

const BIP39_URL = 'https://raw.githubusercontent.com/bitcoin/bips/refs/heads/master/bip-0039/english.txt' as const;

const fetchBIP39 = async (): Promise<BIP39Response[]> => {
  try {
    const res = await fetch(BIP39_URL, { method: "GET", headers: { "Accept": "text/plain" }});
    const text = await res.text();
    return text.trim().split("\n").map((word, index) => ({ index: index + 1, word }));
  } catch (err) {
    console.error(err);
    throw new Error("BIP39 불러오기 실패");
  }
};


export default function BIP39Page() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const { data: bip39List } = useQuery<BIP39Response[], Error>({
    queryKey: ["BIP39"],
    queryFn: fetchBIP39,
    staleTime: 60 * 1000 * 1000,
  });
  // endregion


  // region [Templates]
  const BIP39Columns = useMemo(() => {
    if (!bip39List) return [[], [], []];

    const colCount = 3;
    const rowCount = Math.ceil(bip39List.length / colCount);
    const result: BIP39Response[][] = Array.from({ length: colCount }, () => []);

    for (let i = 0; i < bip39List.length; i++) {
      const colIndex = Math.floor(i / rowCount); // 열 우선 계산
      result[colIndex].push(bip39List[i]);
    }

    return result;
  }, [bip39List]);
  // endregion


  return (
    <PageLayout className="BIP39__page__area">
      <div className="BIP39__page__area__wrapper">
        {BIP39Columns.map((col, idx) => (
          <ul key={col[idx]?.word} className="BIP39__page__area__wrapper__list">
            {col.map((item) => (
              <li key={item.word} className="BIP39__page__area__wrapper__list__item">
                <span>{item.index}.</span>
                <span>{item.word}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </PageLayout>
  );
}
