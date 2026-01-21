"use client";

import { ChangeEvent, memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { KTextField } from "kku-ui";
import { toBip39Binary } from "@/shared/utils/calculate";
import type { BIP39Item } from "@/shared/query/useBip39Query";

interface BIP39PageProps {
  initialData: BIP39Item[];
}

const ENGLISH_REG = /^[A-Za-z]+$/;


const Bip39Page = ({ initialData }: BIP39PageProps) => {

  // region [Hooks]

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const bip39List = useMemo(() => (
    initialData.filter(item => item.word.startsWith(deferredSearch.toLowerCase()))
  ), [initialData, deferredSearch]);
  // endregion

  // region [Events]
  const onChangeSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (ENGLISH_REG.test(val) || val === "") {
      setSearch(val);
    }
  }, []);
  // endregion

  return (
    <>
      {/* Search Area */}
      <div className="flex items-center gap-4">
        <KTextField
          value={search}
          onChange={onChangeSearch}
          width="full"
          size="lg"
          placeholder="검색(4자리)"
          maxLength={4}
        />
      </div>

      {/* View Area */}
      <div className="flex">
        <ul className="flex-1 flex flex-col m-0 p-0 list-none">
          {/* List Header */}
          <li className="flex justify-between items-center w-full p-0.5 tracking-[-1px] text-[18px] mb-2">
            <div
              className="flex justify-start items-center gap-[3px] font-bold whitespace-nowrap text-[20px] w-[116px]">
              Word List
            </div>
            <div className="flex justify-end items-center gap-[2px] font-bold whitespace-nowrap text-[20px] mr-[160px]">
              Binary
            </div>
          </li>

          {/* List Content */}
          {bip39List?.map(({ word, index }) => (
            <li key={word}
                className="flex justify-between items-center w-full p-0.5 tracking-[-1px] text-[18px] dark:border-gray-500">
              <div className="flex justify-start items-center gap-[3px]">
                <span className="mr-[3px]">{index}.</span>
                <span>{word}</span>
              </div>
              <div className="flex justify-end items-center gap-[2px]">
                {toBip39Binary(index).split("").map((item, idx) => (
                  // eslint-disable-next-line react/jsx-key
                  <span
                    className={[
                      "w-[17px] h-[17px] border border-current rounded-full transition-colors",
                      item === "*" ? "bg-current" : "bg-transparent",
                      idx === 5 ? "mr-2" : "" // 6번째 요소(index 5) 뒤에 spacing-8(8px) 여백
                    ].join(" ")}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

const MemoizedBip39Page = memo(Bip39Page);
MemoizedBip39Page.displayName = "Bip39Page";

export default MemoizedBip39Page;