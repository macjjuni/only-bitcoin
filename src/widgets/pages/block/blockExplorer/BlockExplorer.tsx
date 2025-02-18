import { memo, useCallback, useMemo, useState } from "react";
import { KTextField } from "kku-ui";
import { DetailIcon } from "@/shared/icons";

const MEMPOOL_TX_SEARCH_URL = "https://mempool.space/ko/tx/";


const BlockExplorer = () => {

  // region [Hooks]

  const [txValue, setTxValue] = useState("");

  // endregion


  // region [Hooks]

  const onChangeTxInput = useCallback(setTxValue, []);

  // endregion


  // region [Privates]

  const onRouteMempool = useCallback(() => {

    const anchorTag = document.createElement("a");
    anchorTag.href = MEMPOOL_TX_SEARCH_URL + txValue;
    anchorTag.target = "_blank";
    anchorTag.click();
    anchorTag.remove();
  }, [txValue]);

  // endregion


  // region [Template]

  const SearchRightAction = useMemo(() => (
    <button className="block-search-box__area__button" type="button" onClick={onRouteMempool}>
      <DetailIcon color="#fff" />
    </button>
  ), [onRouteMempool]);

  // endregion


  return (
    <div className="block-search-box__area">
      <KTextField value={txValue} onChange={onChangeTxInput} fullWidth rightAction={SearchRightAction}
                  placeholder="트렌젝션을 검색해 보세요" />
    </div>
  );
};

export default memo(BlockExplorer);