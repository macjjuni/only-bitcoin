import { memo, useCallback, useMemo, useState } from "react";
import { KIcon, KTextField } from "kku-ui";
import { clipboardUtil } from "kku-util";
import "./BlocksExplorer.scss";


const MEMPOOL_TX_SEARCH_URL = "https://mempool.space/ko/tx/";


const BlocksExplorer = () => {

  // region [Hooks]

  const [txValue, setTxValue] = useState("");

  // endregion


  // region [Privates]

  const clearInput = useCallback(() => {
    setTxValue('');
  }, []);

  const pasteToInput = useCallback(async () => {
    const readText = await clipboardUtil.pasteFromClipboard();
    setTxValue(readText);
  }, []);

  const onRouteMempool = useCallback(() => {

    if (txValue.trim() === '') { return; }

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
      {txValue.length !== 0 && (<KIcon icon="close" color="#fff" size={18} onClick={clearInput} />)}
      <KIcon icon="paste" color="#fff" onClick={onClickPasteIcon} />
      <KIcon icon="search" color="#fff" onClick={onRouteMempool} />
    </div>

  ), [onRouteMempool]);

  // endregion


  return (
    <div className="block-search-box__area">
      <KTextField value={txValue} onChange={onChangeTxInput} fullWidth rightAction={SearchRightAction}
                  placeholder="트렌젝션을 검색해 보세요" />
    </div>
  );
};

export default memo(BlocksExplorer);
