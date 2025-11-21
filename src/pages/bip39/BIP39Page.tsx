import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { KIcon, KTextField } from "kku-ui";
import { useQuery } from "@tanstack/react-query";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import { fetchBIP39 } from "@/shared/api";
import "./BIP39Page.scss";
import { toBip39Binary } from "@/shared/utils/calculate";

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


  return (
    <PageLayout className="BIP39__page">
      <div className="BIP39__page__top">
        <KTextField label="검색(4자리)" value={search} onChange={onChangeSearch}
                    width="100%" className="BIP39__page__search" maxLength={4}
                    leftContent={<KIcon icon="search" style={{ marginLeft: 12 }} />} />
      </div>
      <div className="BIP39__page__view">
        <ul className="BIP39__page__view__list">
          <li className="BIP39__page__view__list__item">
            <div className="BIP39__page__view__list__item__left title">Word List</div>
            <div className="BIP39__page__view__list__item__right title">Binary</div>
          </li>
          {bip39List?.map(({ word, index }) => (
            <li key={word} className="BIP39__page__view__list__item">
              <div className="BIP39__page__view__list__item__left">
                <span>{index}.</span><span>{word}</span>
              </div>
              <div className="BIP39__page__view__list__item__right">
                {toBip39Binary(index).split('').map(item => (
                  // eslint-disable-next-line react/jsx-key
                  <span className={`BIP39__page__view__list__item__right__binary${item === '*' ? '--active' : ''}`} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}
