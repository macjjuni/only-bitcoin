import { ChangeEvent, memo, useCallback, useMemo, useRef, useState } from "react";
import { KInputGroupAddon, KInputGroupInput, KButton, KIcon, KInputGroup } from "kku-ui";
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

    if (txValue.trim() === "") {
      searchRef.current?.focus();
      return;
    }

    const anchorTag = document.createElement("a");
    anchorTag.href = MEMPOOL_TX_SEARCH_URL + txValue;
    anchorTag.target = "_blank";
    anchorTag.click();
    anchorTag.remove();
  }, [txValue]);
  // endregion


  // region [Events]
  const onChangeTxInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTxValue(e.target.value?.trim())
  }, []);

  const onClickPasteIcon = useCallback(() => {
    pasteToInput().then();
  }, [txValue]);
  // endregion


  // region [Template]
  const SearchRightAction = useMemo(() => (
    <div className="flex items-center gap-1.5">
      {txValue.length !== 0 && (<KIcon icon="close" color="currentColor" size={16} onClick={clearInput} />)}
      <KIcon icon="paste" size={20} color="currentColor" onClick={onClickPasteIcon} />
      <KButton size="icon" variant="link" onClick={onRouteMempool} style={{ color: 'currentColor' }}>검색</KButton>
    </div>

  ), [onRouteMempool]);
  // endregion

  return (
      <KInputGroup className="mt-0.5 mb-2" size="md">
        <KInputGroupAddon align="inline-start">
        <KIcon icon="search" size={20} color="currentColor" />
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
TxSearcher.displayName = 'TxSearcher';
MemoizedTxSearcher.displayName = 'TxSearcher';

export default MemoizedTxSearcher;
