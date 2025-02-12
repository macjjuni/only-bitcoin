import { memo } from "react";
import "./Footer.scss";

const Footer = () => {
  return (
    <footer className="only-btc__layout__footer">
      {new Date().getFullYear()} Only Bitcoin.
    </footer>
  );
}

export default memo(Footer);
