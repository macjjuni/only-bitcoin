import { memo, useCallback, useMemo, useRef, useState } from "react";
import { KIcon, KTextField, KTextFieldRefs } from "kku-ui";
import { clipboardUtil } from "kku-util";
import "./BlocksExplorer.scss";


const MEMPOOL_TX_SEARCH_URL = "https://mempool.space/ko/tx/";


const BlocksExplorer = () => {

  // region [Hooks]

  const searchRef = useRef<KTextFieldRefs>(null);
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

  const onChangeTxInput = useCallback(setTxValue, []);

  const onClickPasteIcon = useCallback(() => {
    pasteToInput().then();
  }, [txValue]);

  // endregion


  // region [Template]

  const SearchRightAction = useMemo(() => (
    <div className="search-right__area">
      {txValue.length !== 0 && (<KIcon icon="close" color="currentColor" size={18} onClick={clearInput} />)}
      <KIcon icon="paste" color="currentColor" onClick={onClickPasteIcon} />
      <KIcon icon="search" color="currentColor" onClick={onRouteMempool} />
    </div>

  ), [onRouteMempool]);

  // endregion


  return (
    <div className="block-search-box__area">
      <KTextField ref={searchRef} className="block-search-box__area__input" value={txValue}
                  onChange={onChangeTxInput} placeholder="트랜잭션을 검색해 보세요" width="100%"
                  rightContent={SearchRightAction} autoCapitalize="off" autoCorrect="off"
                  autoComplete="off" label="Tx ID" />
    </div>
  );
};

export default memo(BlocksExplorer);
