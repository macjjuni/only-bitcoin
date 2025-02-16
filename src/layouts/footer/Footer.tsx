import { memo } from "react";
import BottomNavigation from "@/widgets/bottomNavigation/BottomNavigation";
import { useResizeOver } from "@/shared/hooks";
import "./Footer.scss";

const Footer = () => {


  // region [Hooks]

  const { isOver: isDeskTopSize } = useResizeOver();

  // endregion


  if (!isDeskTopSize) {
    return (<BottomNavigation />);
  }


  return (
    <footer className="only-btc__layout__footer">
      {new Date().getFullYear()} Only Bitcoin.
    </footer>
  );
};

export default memo(Footer);
