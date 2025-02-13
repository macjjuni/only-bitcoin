import { memo } from "react";
import { Link } from "react-router-dom";
import "./Header.scss";


const Header = () => {

  return (
    <header className="only-btc__layout__header">
      <Link to="/" className="only-btc__layout__header__link">
        {import.meta.env.VITE_TITLE}
      </Link>
    </header>
  );
};

export default memo(Header);
