import "./NotKeyNotBtc.scss";
import { CSSProperties, memo, useMemo } from "react";

function NotKeyNotBtc({ fontSize }: { fontSize?: string }) {
  const rootStyle = useMemo(() => {
    const style: CSSProperties = {};

    if (fontSize) {
      style.fontSize = fontSize;
    }
    return style;
  }, [fontSize]);

  return (
    <h2 className="only-btc__not-key-not-btc" style={rootStyle}>
      Not your keys, not your ₿itcoin
    </h2>
  );
}

export default memo(NotKeyNotBtc);
