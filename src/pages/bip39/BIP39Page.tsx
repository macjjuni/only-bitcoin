import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { KIcon, KTextField } from "kku-ui";
import { useQuery } from "@tanstack/react-query";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import { fetchBIP39 } from "@/shared/api";
import "./BIP39Page.scss";

type BIP39Response = { index: number, word: string };

const ENGLISH_REG = /^[A-Za-z]+$/;

export default function BIP39Page() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());

  const { data } = useQuery<BIP39Response[], Error>({
    queryKey: ["BIP39"],
    queryFn: fetchBIP39,
    staleTime: 60 * 1000 * 1000
  });

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const bip39List = useMemo(() => (
    data?.filter(item => item.word.startsWith(deferredSearch.toLowerCase()))
  ), [data, deferredSearch]);
  // endregion


  // region [Events]
  const onChangeSearch = useCallback((val: string) => {
    if (ENGLISH_REG.test(val) || val === '') {
      setSearch(val);
    }
  }, []);
  // endregion


  // region [Templates]
  const BIP39List = useMemo(() => {
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
    <PageLayout className="BIP39__page">
      <div className="BIP39__page__top">
        <KTextField label="검색(4자리)" value={search} onChange={onChangeSearch}
                    width="100%" className="BIP39__page__search" maxLength={4}
                    leftContent={<KIcon icon="search" style={{ marginLeft: 12 }} />} />
      </div>
      <div className="BIP39__page__view">
        {BIP39List.map((col, idx) => (
          <ul key={col[idx]?.index} className="BIP39__page__view__list">
            {col.map((item) => (
              <li key={item.word} className="BIP39__page__view__list__item">
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
