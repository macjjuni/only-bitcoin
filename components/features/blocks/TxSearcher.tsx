'use client'

import { ChangeEvent, memo, useCallback, useMemo, useRef, useState } from "react";
import { ClipboardPaste, Search, X } from "lucide-react";
import { KButton, KInputGroup, KInputGroupAddon, KInputGroupInput } from "kku-ui";
import { clipboardUtil } from "kku-util";


const MEMPOOL_TX_SEARCH_URL = "https://mempool.space/ko/tx/";


const TxSearcher = () => {
  // region [Hooks]
  const searchRef = useRef<HTMLInputElement>(null);
  const [txValue, setTxValue] = useState("");
  // endregion


  // region [Privates]
  const clearInput = useCallback(() => {
    setTxValue("");
  }, []);

  const pasteToInput = useCallback(async () => {
    const readText = await clipboardUtil.pasteFromClipboard();
    setTxValue(readText);
  }, []);

  const onRouteMempool = useCallback(() => {
    const trimmedValue = txValue.trim();

    if (trimmedValue === "") {
      searchRef.current?.focus();
      return;
    }

    const searchUrl = `${MEMPOOL_TX_SEARCH_URL}${trimmedValue}`;

    if (typeof window !== 'undefined') {
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
  }, [txValue]);
  // endregion


  // region [Events]
  const onChangeTxInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTxValue(e.target.value?.trim());
  }, []);

  const onClickPasteIcon = useCallback(() => {
    pasteToInput().then();
  }, [txValue]);
  // endregion


  // region [Template]
  const SearchRightAction = useMemo(() => (
    <div className="flex items-center gap-1.5 [&&>svg]:cursor-pointer">
      {txValue.length !== 0 && <X onClick={clearInput} />}
      <ClipboardPaste size={24} className="p-0.5" onClick={onClickPasteIcon} />
      <KButton size="icon" variant="link" onClick={onRouteMempool} style={{ color: "currentColor" }}>검색</KButton>
    </div>

  ), [onRouteMempool]);
  // endregion

  return (
    <KInputGroup className="mt-0.5 mb-2" size="lg">
      <KInputGroupAddon align="inline-start" className="pr-0">
        <Search size={20} />
      </KInputGroupAddon>
      <KInputGroupInput ref={searchRef} value={txValue} onChange={onChangeTxInput}
                        placeholder="트랜잭션을 검색해 보세요" width="full"
                        autoCapitalize="off" autoCorrect="off" autoComplete="off" />
      <KInputGroupAddon align="inline-end">
        {SearchRightAction}
      </KInputGroupAddon>
    </KInputGroup>
  );
};


const MemoizedTxSearcher = memo(TxSearcher);
TxSearcher.displayName = "TxSearcher";
MemoizedTxSearcher.displayName = "TxSearcher";

export default MemoizedTxSearcher;
