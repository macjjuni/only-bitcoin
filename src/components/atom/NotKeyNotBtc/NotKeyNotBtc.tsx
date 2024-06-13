import "./NotKeyNotBtc.scss";
import { CSSProperties, memo, useMemo } from "react";

function NotKeyNotBtc({ fontSize, style }: { fontSize?: string; style?: CSSProperties }) {
  const rootStyle = useMemo(() => {
    const styles: CSSProperties = { ...style };

    if (fontSize) {
      styles.fontSize = fontSize;
    }
    return styles;
  }, [fontSize, style]);

  return (
    <h2 className="only-btc__not-key-not-btc" style={rootStyle}>
      Not your keys, not your ₿itcoin
    </h2>
  );
}

export default memo(NotKeyNotBtc);
