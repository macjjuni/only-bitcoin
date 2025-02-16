import { memo } from "react";
import { Link } from "react-router-dom";
import { useResizeOver } from "@/shared/hooks";
import { PageTitle } from "@/widgets";
import "./Header.scss";


const Header = () => {

  // region [Hooks]

  const { isOver: isDeskTopSize } = useResizeOver();

  // endregion


  if (!isDeskTopSize) {
    return (<PageTitle />);
  }


  return (
    <header className="only-btc__layout__header">
      <Link to="/" className="only-btc__layout__header__link">
        {import.meta.env.VITE_TITLE}
      </Link>
    </header>
  );
};

export default memo(Header);
